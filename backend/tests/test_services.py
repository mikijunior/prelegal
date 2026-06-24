"""Tests for app/services/documents.py: upsert_draft, _compute_progress."""

import json

import pytest

from app.document_registry import REGISTRY
from app.models import Document
from app.schemas import DocumentType
from app.services.documents import upsert_draft


class TestComputeProgress:
    """_compute_progress counts required (non-optional) fields that are non-empty."""

    def _fill_required(self, doc_type: DocumentType, fields: dict, fill_keys: list[str]) -> dict:
        """Helper: start with empty required fields, fill only fill_keys."""
        all_required = list(REGISTRY[doc_type].fields_class.model_fields.keys())
        result = {k: '' for k in all_required}
        for k in fill_keys:
            if k in result:
                result[k] = fields.get(k, f"value_for_{k}")
        return result

    def test_empty_fields_returns_zero_filled(self):
        from app.services.documents import _compute_progress
        for doc_type in DocumentType:
            filled, total = _compute_progress({}, doc_type)
            assert filled == 0
            assert total == len(REGISTRY[doc_type].fields_class.model_fields) - len(
                REGISTRY[doc_type].optional_fields
            )

    def test_all_required_filled_returns_full_count(self):
        from app.services.documents import _compute_progress
        doc_type = DocumentType.mutual_nda
        required = list(REGISTRY[doc_type].fields_class.model_fields.keys())
        non_optional_required = [k for k in required if k not in REGISTRY[doc_type].optional_fields]
        fields = {k: f"val_{k}" for k in non_optional_required}
        filled, total = _compute_progress(fields, doc_type)
        assert filled == total == len(non_optional_required)

    def test_partially_filled(self):
        from app.services.documents import _compute_progress
        doc_type = DocumentType.baa
        fields = {'provider': 'HealthTech', 'company': 'Hospital', 'baaEffectiveDate': '',
                  'agreement': '', 'breachNotificationPeriod': ''}
        filled, total = _compute_progress(fields, doc_type)
        assert filled == 2
        assert total == 5  # BAA has 5 required fields

    def test_null_vs_empty_string_both_count_as_unfilled(self):
        from app.services.documents import _compute_progress
        doc_type = DocumentType.baa
        fields = {'provider': 'HealthTech', 'company': 'Hospital',
                  'baaEffectiveDate': None, 'agreement': None,
                  'breachNotificationPeriod': None, 'limitations': None}
        filled, total = _compute_progress(fields, doc_type)
        assert filled == 2  # only provider and company are filled


class TestUpsertDraft:
    def test_creates_new_document_when_none_exists(self, db_session, test_user):
        doc = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'provider': 'Acme', 'company': 'Beta'},
        )
        db_session.expire_all()
        assert doc.id is not None
        assert doc.user_id == test_user.id
        assert doc.document_type == 'baa'
        parsed = json.loads(doc.fields_json)
        assert parsed['provider'] == 'Acme'
        assert parsed['company'] == 'Beta'

    def test_merges_incoming_fields_with_existing(self, db_session, test_user):
        # First save
        doc1 = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'provider': 'First Corp'},
        )
        doc_id = doc1.id

        # Second save with new fields
        doc2 = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'company': 'Second Corp'},
        )

        assert doc2.id == doc_id
        db_session.expire_all()
        re_fetched = db_session.get(Document, doc_id)
        parsed = json.loads(re_fetched.fields_json)
        assert parsed['provider'] == 'First Corp'
        assert parsed['company'] == 'Second Corp'

    def test_incoming_overwrites_existing_fields(self, db_session, test_user):
        doc1 = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'provider': 'Old Provider'},
        )
        doc2 = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'provider': 'New Provider'},
        )
        assert doc2.id == doc1.id
        db_session.expire_all()
        re_fetched = db_session.get(Document, doc1.id)
        assert json.loads(re_fetched.fields_json)['provider'] == 'New Provider'

    def test_required_filled_updates_after_merge(self, db_session, test_user):
        doc1 = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'provider': 'Acme'},
        )
        assert doc1.required_filled == 1
        assert doc1.required_total == 5

        doc2 = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'company': 'Beta Corp'},
        )
        assert doc2.required_filled == 2
        assert doc2.required_total == 5

    def test_ignores_keys_not_in_model(self, db_session, test_user):
        doc = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'provider': 'Acme', 'not_a_real_field': 'should be ignored'},
        )
        parsed = json.loads(doc.fields_json)
        assert 'not_a_real_field' not in parsed
        assert 'provider' in parsed

    def test_upsert_is_per_user(self, db_session, test_user):
        from app.auth import create_access_token
        from app.models import User

        other_user = User(email='other@example.com',
                          hashed_password='$2b$12$ignored')
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)

        upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'provider': 'My Provider'},
        )

        doc = upsert_draft(
            db_session,
            user_id=other_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'company': 'Other Company'},
        )

        # Other user has no provider set (different draft)
        db_session.expire_all()
        assert 'provider' not in json.loads(doc.fields_json)
        assert json.loads(doc.fields_json).get('company') == 'Other Company'

    def test_empty_incoming_fields_does_not_clear_existing(self, db_session, test_user):
        doc1 = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={'provider': 'Acme', 'company': 'Beta'},
        )
        doc2 = upsert_draft(
            db_session,
            user_id=test_user.id,
            doc_type=DocumentType.baa,
            incoming_fields={},
        )
        assert doc2.id == doc1.id
        db_session.expire_all()
        re_fetched = db_session.get(Document, doc1.id)
        parsed = json.loads(re_fetched.fields_json)
        assert parsed['provider'] == 'Acme'
        assert parsed['company'] == 'Beta'
