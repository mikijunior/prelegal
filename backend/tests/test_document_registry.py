"""Tests for document_registry.py: REGISTRY, required_field_names, display_name_for."""

import pytest

from app.document_registry import REGISTRY, required_field_names, display_name_for
from app.schemas import DocumentType


class TestRequiredFieldNames:
    """required_field_names excludes optional_fields and returns all required keys."""

    def test_mutual_nda_excludes_modifications(self):
        fields = required_field_names(DocumentType.mutual_nda)
        assert 'modifications' not in fields
        # All other NDA fields should be present
        assert 'party1Company' in fields
        assert 'party2Company' in fields
        assert 'governingLaw' in fields
        assert 'purpose' in fields

    def test_baa_excludes_limitations(self):
        fields = required_field_names(DocumentType.baa)
        assert 'limitations' not in fields
        assert 'provider' in fields
        assert 'company' in fields
        assert 'baaEffectiveDate' in fields

    def test_csa_excludes_many_optional_fields(self):
        fields = required_field_names(DocumentType.csa)
        optional = {
            'technicalSupport', 'useLimitations', 'paymentProcess',
            'nonRenewalNoticeDate', 'increasedClaims', 'increasedCapAmount',
            'unlimitedClaims', 'providerCoveredClaims', 'customerCoveredClaims',
            'additionalWarranties', 'dpa',
        }
        for opt in optional:
            assert opt not in fields, f"{opt} should be optional but was in required"
        # Required fields should be present
        assert 'provider' in fields
        assert 'customer' in fields
        assert 'effectiveDate' in fields
        assert 'governingLaw' in fields

    def test_dpa_excludes_optional_fields(self):
        fields = required_field_names(DocumentType.dpa)
        optional = {
            'specialCategoryData', 'specialCategoryDataRestrictions',
            'frequencyOfTransfer', 'approvedSubprocessors',
            'governingMemberState', 'securityPolicy', 'providerSecurityContact',
        }
        for opt in optional:
            assert opt not in fields

    def test_partnership_excludes_optional_fields(self):
        fields = required_field_names(DocumentType.partnership)
        optional = {
            'generalCapAmount', 'paymentProcess', 'paymentSchedule',
            'brandGuidelines', 'increasedClaims', 'increasedCapAmount',
            'unlimitedClaims', 'companyCoveredClaim', 'partnerCoveredClaims',
            'additionalWarranties', 'dpa',
        }
        for opt in optional:
            assert opt not in fields
        assert 'company' in fields
        assert 'partner' in fields

    def test_pilot_excludes_optional_fields(self):
        fields = required_field_names(DocumentType.pilot)
        assert 'generalCapAmount' not in fields
        assert 'noticeAddress' not in fields
        assert 'provider' in fields
        assert 'customer' in fields

    def test_psa_excludes_optional_fields(self):
        fields = required_field_names(DocumentType.psa)
        optional = {
            'generalCapAmount', 'customerPolicies', 'insuranceMinimums',
            'rejectionPeriod', 'resubmissionPeriod', 'customerObligations',
            'paymentPeriod', 'increasedClaims', 'increasedCapAmount',
            'unlimitedClaims', 'providerCoveredClaims', 'customerCoveredClaims',
            'additionalWarranties', 'dpa', 'securityPolicy',
        }
        for opt in optional:
            assert opt not in fields

    def test_sla_excludes_optional_fields(self):
        fields = required_field_names(DocumentType.sla)
        assert 'responseTimeCredit' not in fields
        assert 'subscriptionPeriod' not in fields
        assert 'scheduledDowntime' not in fields

    def test_software_license_excludes_optional_fields(self):
        fields = required_field_names(DocumentType.software_license)
        optional = {
            'warrantyPeriod', 'deletionProcedure', 'nonRenewalNoticeDate',
            'generalCapAmount', 'increasedClaims', 'increasedCapAmount',
            'unlimitedClaims', 'providerCoveredClaims', 'customerCoveredClaims',
            'additionalWarranties',
        }
        for opt in optional:
            assert opt not in fields

    def test_ai_addendum_excludes_optional_fields(self):
        fields = required_field_names(DocumentType.ai_addendum)
        optional = {'trainingData', 'trainingPurposes', 'trainingRestrictions',
                    'improvementRestrictions'}
        for opt in optional:
            assert opt not in fields
        assert 'provider' in fields
        assert 'customer' in fields
        assert 'parentAgreement' in fields

    def test_design_partner_excludes_fees(self):
        fields = required_field_names(DocumentType.design_partner)
        assert 'fees' not in fields
        assert 'provider' in fields
        assert 'partner' in fields
        assert 'term' in fields

    def test_all_11_doc_types_have_required_fields(self):
        for doc_type in DocumentType:
            fields = required_field_names(doc_type)
            assert isinstance(fields, list)
            assert len(fields) > 0, f"{doc_type} has no required fields"


class TestDisplayNameFor:
    def test_returns_display_name_for_every_doc_type(self):
        for doc_type in DocumentType:
            name = display_name_for(doc_type)
            assert isinstance(name, str)
            assert len(name) > 0

    def test_mutual_nda(self):
        assert display_name_for(DocumentType.mutual_nda) == "Mutual Non-Disclosure Agreement"

    def test_baa(self):
        assert display_name_for(DocumentType.baa) == "Business Associate Agreement"

    def test_csa(self):
        assert display_name_for(DocumentType.csa) == "Cloud Service Agreement"


class TestRegistry:
    def test_all_document_types_are_registered(self):
        for doc_type in DocumentType:
            assert doc_type in REGISTRY

    def test_each_config_has_required_attributes(self):
        for doc_type, config in REGISTRY.items():
            assert config.display_name
            assert config.description
            assert config.fields_class is not None
            assert config.llm_response_class is not None
            assert isinstance(config.field_descriptions, dict)
            assert isinstance(config.optional_fields, set)

    def test_field_descriptions_keys_match_fields_class(self):
        for doc_type, config in REGISTRY.items():
            model_keys = set(config.fields_class.model_fields.keys())
            desc_keys = set(config.field_descriptions.keys())
            assert desc_keys == model_keys, f"{doc_type} field_descriptions keys don't match fields_class"

    def test_optional_fields_are_subset_of_model_fields(self):
        for doc_type, config in REGISTRY.items():
            model_keys = set(config.fields_class.model_fields.keys())
            assert config.optional_fields.issubset(model_keys), \
                f"{doc_type} optional_fields contain unknown keys"
