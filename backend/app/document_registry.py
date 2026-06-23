import json
from dataclasses import dataclass
from typing import Any, Optional, Type

from app.schemas import (
    AIAddendumFields,
    AIAddendumLLMResponse,
    BAAFields,
    BAALLMResponse,
    CSAFields,
    CSALLMResponse,
    ChatLLMResponse,
    DPAFields,
    DPALLMResponse,
    DesignPartnerFields,
    DesignPartnerLLMResponse,
    DocumentType,
    NDAFields,
    PSAFields,
    PSALLMResponse,
    PartnershipFields,
    PartnershipLLMResponse,
    PilotFields,
    PilotLLMResponse,
    SLAFields,
    SLALLMResponse,
    SoftwareLicenseFields,
    SoftwareLicenseLLMResponse,
)


@dataclass
class DocumentConfig:
    display_name: str
    description: str
    fields_class: Type[Any]
    llm_response_class: Type[Any]
    field_descriptions: dict[str, str]
    optional_fields: set[str]


def _build_prompt(
    display_name: str,
    field_descriptions: dict[str, str],
    optional_fields: set[str],
    current_fields: Any,
) -> str:
    fields_dict = current_fields.model_dump()
    filled = {k: v for k, v in fields_dict.items() if v not in (None, "")}
    unfilled = [
        k for k, v in fields_dict.items()
        if v in (None, "") and k not in optional_fields
    ]

    fields_list = "\n".join(
        f"  - {k}: {desc}" for k, desc in field_descriptions.items()
    )

    already = f"\nALREADY GATHERED:\n{json.dumps(filled, indent=2)}\n" if filled else ""
    needed = (
        f"\nSTILL NEEDED: {', '.join(unfilled)}"
        if unfilled
        else "\nAll fields gathered — help the user review and download."
    )

    return f"""You are a friendly AI legal assistant helping users create a {display_name}.

Have a natural, efficient conversation to gather all required information. Group related questions where sensible. For dates, accept natural language and convert to YYYY-MM-DD in your response.

FIELDS TO GATHER:
{fields_list}
{already}{needed}

In the "reply" field, write your conversational response to the user.
In the "fields" object, populate ONLY fields you learned new information about in THIS turn — set everything else to null. Use an empty string for optional fields when the user confirms there are none.
When all fields are gathered, congratulate the user and tell them to click "Download PDF"."""


# ── Pre-selection ─────────────────────────────────────────────────────────────

SUPPORTED_DOCS_DESCRIPTION = """
- mutual_nda: Mutual Non-Disclosure Agreement — protects confidential information shared between two parties
- baa: Business Associate Agreement — HIPAA compliance between covered entities and business associates
- csa: Cloud Service Agreement — SaaS and cloud product subscriptions
- dpa: Data Processing Agreement — GDPR-compliant handling of personal data
- partnership: Partnership Agreement — referral, reseller, and technology partnerships
- pilot: Pilot Agreement — time-limited evaluation or proof-of-concept use of a product
- psa: Professional Services Agreement — consulting, implementation, and professional services
- sla: Service Level Agreement — uptime commitments and remedies for cloud/SaaS services
- software_license: Software License Agreement — on-premise or installed software licensing
- ai_addendum: AI Addendum — governs AI features within an existing agreement
- design_partner: Design Partner Agreement — early-access product feedback relationships
"""


def build_pre_selection_prompt() -> str:
    return f"""You are PreLegal, a friendly AI legal assistant. Your job is to understand what legal document the user needs and help them create it.

The supported document types are:
{SUPPORTED_DOCS_DESCRIPTION}

Ask the user what type of legal document they need. Based on their response:
- If they clearly indicate a supported document type, set "document_type" to the matching value.
- If they want something not on the list (e.g. a will, employment contract, patent filing), explain that you cannot generate that document, then suggest the closest supported type you can help with.
- If their request is ambiguous, ask a clarifying question and leave "document_type" as null.

In the "reply" field, write your conversational response.
In "document_type", set the matching document type key (e.g. "mutual_nda") once you're confident of the type, otherwise leave it null."""


# ── Per-document configs ──────────────────────────────────────────────────────

_NDA_FIELD_DESCRIPTIONS = {
    "party1Company": "First party's company name",
    "party1Name": "First party signatory's full name",
    "party1Title": "First party signatory's job title",
    "party1Address": "First party's notice address (email or postal)",
    "party1Date": "First party's signing date (YYYY-MM-DD format)",
    "party2Company": "Second party's company name",
    "party2Name": "Second party signatory's full name",
    "party2Title": "Second party signatory's job title",
    "party2Address": "Second party's notice address (email or postal)",
    "party2Date": "Second party's signing date (YYYY-MM-DD format)",
    "purpose": "Purpose of the NDA — how confidential information may be used",
    "effectiveDate": "Agreement effective date (YYYY-MM-DD format)",
    "mndaTermType": "'expires' (fixed term) or 'continues' (until terminated)",
    "mndaTermYears": "Number of years (only when mndaTermType is 'expires')",
    "confidentialityTermType": "'period' (fixed years) or 'perpetuity' (forever)",
    "confidentialityTermYears": "Number of years (only when confidentialityTermType is 'period')",
    "governingLaw": "Governing state law (e.g., 'Delaware')",
    "jurisdiction": "Court jurisdiction (e.g., 'New Castle, DE')",
    "modifications": "Any modifications to standard MNDA terms (empty string if none)",
}

_BAA_FIELD_DESCRIPTIONS = {
    "provider": "Provider (business associate) entity name",
    "company": "Company (covered entity) name",
    "baaEffectiveDate": "BAA effective date (YYYY-MM-DD format)",
    "agreement": "Name or description of the underlying service agreement",
    "breachNotificationPeriod": "How quickly Provider must report a PHI breach (e.g., '72 hours')",
    "limitations": "Restrictions on subcontractors, offshoring, de-identification, or aggregation (empty string if none)",
}

_CSA_FIELD_DESCRIPTIONS = {
    "provider": "Provider (vendor) entity name",
    "customer": "Customer entity name",
    "effectiveDate": "Framework terms effective date (YYYY-MM-DD format)",
    "governingLaw": "Governing state law (e.g., 'Delaware')",
    "chosenCourts": "Courts for dispute resolution (e.g., 'courts in Delaware')",
    "generalCapAmount": "General liability cap dollar amount (e.g., '$50,000')",
    "subscriptionPeriod": "Length of the service subscription (e.g., '12 months')",
    "orderDate": "Order form date (YYYY-MM-DD format)",
    "technicalSupport": "Description of support level provided (empty string if standard)",
    "useLimitations": "Permitted use restrictions (empty string if none)",
    "paymentProcess": "Invoicing vs. automatic payment and billing cycle (empty string if standard)",
    "nonRenewalNoticeDate": "Deadline to give non-renewal notice (empty string if not applicable)",
    "increasedClaims": "Claim types subject to a higher liability cap (empty string if none)",
    "increasedCapAmount": "Higher liability cap for increased claims (empty string if none)",
    "unlimitedClaims": "Claim types with no liability cap (empty string if none)",
    "providerCoveredClaims": "Types of claims Provider will indemnify (empty string if standard)",
    "customerCoveredClaims": "Types of claims Customer will indemnify (empty string if standard)",
    "additionalWarranties": "Extra warranties the parties commit to (empty string if none)",
    "dpa": "Reference to a data processing agreement (empty string if none)",
}

_DPA_FIELD_DESCRIPTIONS = {
    "provider": "Provider (data processor) entity name",
    "customer": "Customer (data controller) entity name",
    "agreement": "Name or description of the parent service agreement",
    "categoriesOfPersonalData": "Types of personal data being processed (e.g., 'name, email, IP address')",
    "categoriesOfDataSubjects": "Who the personal data relates to (e.g., 'end users of the service')",
    "natureAndPurposeOfProcessing": "Description of what processing is done and why",
    "durationOfProcessing": "How long processing will occur (e.g., 'for the term of the agreement')",
    "specialCategoryData": "Sensitive data per GDPR Article 9 (empty string if none)",
    "specialCategoryDataRestrictions": "Protections for sensitive data (empty string if none)",
    "frequencyOfTransfer": "How often data is transferred (empty string if continuous)",
    "approvedSubprocessors": "List of approved subprocessors with country and tasks (empty string if none)",
    "governingMemberState": "EEA member state governing SCCs for GDPR transfers (empty string if not applicable)",
    "securityPolicy": "URL or name of Provider's security standards document (empty string if none)",
    "providerSecurityContact": "Contact person or email for security inquiries (empty string if none)",
}

_PARTNERSHIP_FIELD_DESCRIPTIONS = {
    "company": "Company (licensor/vendor) entity name",
    "partner": "Partner (reseller/referral) entity name",
    "effectiveDate": "Agreement effective date (YYYY-MM-DD format)",
    "governingLaw": "Governing state law (e.g., 'Delaware')",
    "chosenCourts": "Courts for dispute resolution",
    "obligations": "Each party's specific obligations under the partnership",
    "territory": "Geographic area of the trademark license (e.g., 'worldwide')",
    "endDate": "When the agreement terminates (YYYY-MM-DD format)",
    "generalCapAmount": "General liability cap dollar amount (empty string if not specified)",
    "paymentProcess": "Billing method and cycle (empty string if none)",
    "paymentSchedule": "When payments are due (empty string if none)",
    "brandGuidelines": "Guidelines for trademark usage (empty string if none)",
    "increasedClaims": "Claim types with higher liability cap (empty string if none)",
    "increasedCapAmount": "Higher liability cap amount (empty string if none)",
    "unlimitedClaims": "Claim types with no cap (empty string if none)",
    "companyCoveredClaim": "Types of claims Company will indemnify (empty string if standard)",
    "partnerCoveredClaims": "Types of claims Partner will indemnify (empty string if standard)",
    "additionalWarranties": "Extra warranties (empty string if none)",
    "dpa": "Reference to a data processing agreement (empty string if none)",
}

_PILOT_FIELD_DESCRIPTIONS = {
    "provider": "Provider (vendor) entity name",
    "customer": "Customer entity name",
    "pilotPeriod": "Duration of the pilot (e.g., '30 days', '3 months')",
    "effectiveDate": "Pilot start date (YYYY-MM-DD format)",
    "governingLaw": "Governing state law (e.g., 'Delaware')",
    "chosenCourts": "Courts for dispute resolution",
    "generalCapAmount": "General liability cap dollar amount (empty string if not specified)",
    "noticeAddress": "Notice address for legal communications (empty string if not specified)",
}

_PSA_FIELD_DESCRIPTIONS = {
    "provider": "Provider (service vendor) entity name",
    "customer": "Customer entity name",
    "effectiveDate": "Agreement effective date (YYYY-MM-DD format)",
    "governingLaw": "Governing state law (e.g., 'Delaware')",
    "chosenCourts": "Courts for dispute resolution",
    "deliverables": "Specific outputs to be created under the SOW",
    "fees": "SOW-specific pricing (e.g., '$10,000 fixed fee')",
    "sowTerm": "End date or duration of the statement of work",
    "generalCapAmount": "General liability cap dollar amount (empty string if not specified)",
    "customerPolicies": "Customer's internal policies Provider must follow (empty string if none)",
    "insuranceMinimums": "Required insurance coverage levels (empty string if standard)",
    "rejectionPeriod": "Time Customer has to reject a deliverable (empty string if standard)",
    "resubmissionPeriod": "Time Provider has to resubmit a corrected deliverable (empty string if standard)",
    "customerObligations": "Customer's responsibilities per SOW (empty string if none)",
    "paymentPeriod": "Payment due window (e.g., 'net 30') (empty string if standard)",
    "increasedClaims": "Claim types with higher liability cap (empty string if none)",
    "increasedCapAmount": "Higher liability cap amount (empty string if none)",
    "unlimitedClaims": "Claim types with no cap (empty string if none)",
    "providerCoveredClaims": "Types of claims Provider will indemnify (empty string if standard)",
    "customerCoveredClaims": "Types of claims Customer will indemnify (empty string if standard)",
    "additionalWarranties": "Extra warranties (empty string if none)",
    "dpa": "Reference to a data processing agreement (empty string if none)",
    "securityPolicy": "Provider's security standards document (empty string if none)",
}

_SLA_FIELD_DESCRIPTIONS = {
    "provider": "Provider (vendor) entity name",
    "customer": "Customer entity name",
    "parentAgreement": "Name or description of the parent CSA this SLA attaches to",
    "targetUptime": "Uptime commitment percentage (e.g., '99.9%')",
    "targetResponseTime": "Support acknowledgment window (e.g., '4 business hours')",
    "supportChannel": "How to submit support requests (e.g., 'email at support@example.com')",
    "uptimeCredit": "Credit formula when uptime SLA is missed (e.g., '10% of monthly fee')",
    "responseTimeCredit": "Credit formula when response time SLA is missed (empty string if same as uptime credit)",
    "subscriptionPeriod": "Subscription period inherited from the CSA (empty string if not specified)",
    "scheduledDowntime": "Planned maintenance windows excluded from uptime (empty string if none)",
}

_SOFTWARE_LICENSE_FIELD_DESCRIPTIONS = {
    "provider": "Provider (licensor) entity name",
    "customer": "Customer (licensee) entity name",
    "effectiveDate": "Agreement effective date (YYYY-MM-DD format)",
    "governingLaw": "Governing state law (e.g., 'Delaware')",
    "chosenCourts": "Courts for dispute resolution",
    "subscriptionPeriod": "License subscription period (e.g., '1 year')",
    "permittedUses": "Authorized use cases for the software",
    "licenseLimits": "Limits on the license (e.g., 'up to 10 named users')",
    "paymentProcess": "Payment method and billing cycle",
    "orderDate": "Order form date (YYYY-MM-DD format)",
    "warrantyPeriod": "Period during which the software warranty applies (empty string if none)",
    "deletionProcedure": "How to uninstall/delete the software on termination (empty string if standard)",
    "nonRenewalNoticeDate": "Deadline to give non-renewal notice (empty string if not applicable)",
    "generalCapAmount": "General liability cap dollar amount (empty string if not specified)",
    "increasedClaims": "Claim types with higher liability cap (empty string if none)",
    "increasedCapAmount": "Higher liability cap amount (empty string if none)",
    "unlimitedClaims": "Claim types with no cap (empty string if none)",
    "providerCoveredClaims": "Types of claims Provider will indemnify (empty string if standard)",
    "customerCoveredClaims": "Types of claims Customer will indemnify (empty string if standard)",
    "additionalWarranties": "Extra warranties (empty string if none)",
}

_AI_ADDENDUM_FIELD_DESCRIPTIONS = {
    "provider": "Provider entity name",
    "customer": "Customer entity name",
    "parentAgreement": "Name or description of the parent agreement this addendum attaches to",
    "trainingData": "Customer data that may be used for model training (empty string if none)",
    "trainingPurposes": "Why the data is used for training (empty string if none)",
    "trainingRestrictions": "Limits on training data usage (empty string if none)",
    "improvementRestrictions": "Limits on non-training product improvement usage (empty string if none)",
}

_DESIGN_PARTNER_FIELD_DESCRIPTIONS = {
    "provider": "Provider (product company) entity name",
    "partner": "Design partner entity name",
    "effectiveDate": "Agreement effective date (YYYY-MM-DD format)",
    "term": "Duration of the design partnership (e.g., '6 months')",
    "governingLaw": "Governing state law (e.g., 'Delaware')",
    "chosenCourts": "Courts for dispute resolution",
    "program": "Description of the design partner program",
    "noticeAddress": "Address for legal notices (email or postal)",
    "fees": "Fees the partner pays, if any (empty string if none)",
}


REGISTRY: dict[DocumentType, DocumentConfig] = {
    DocumentType.mutual_nda: DocumentConfig(
        display_name="Mutual Non-Disclosure Agreement",
        description="Protects confidential information shared between two parties",
        fields_class=NDAFields,
        llm_response_class=ChatLLMResponse,
        field_descriptions=_NDA_FIELD_DESCRIPTIONS,
        optional_fields={"modifications"},
    ),
    DocumentType.baa: DocumentConfig(
        display_name="Business Associate Agreement",
        description="HIPAA compliance between covered entities and business associates",
        fields_class=BAAFields,
        llm_response_class=BAALLMResponse,
        field_descriptions=_BAA_FIELD_DESCRIPTIONS,
        optional_fields={"limitations"},
    ),
    DocumentType.csa: DocumentConfig(
        display_name="Cloud Service Agreement",
        description="SaaS and cloud product subscriptions",
        fields_class=CSAFields,
        llm_response_class=CSALLMResponse,
        field_descriptions=_CSA_FIELD_DESCRIPTIONS,
        optional_fields={
            "technicalSupport", "useLimitations", "paymentProcess",
            "nonRenewalNoticeDate", "increasedClaims", "increasedCapAmount",
            "unlimitedClaims", "providerCoveredClaims", "customerCoveredClaims",
            "additionalWarranties", "dpa",
        },
    ),
    DocumentType.dpa: DocumentConfig(
        display_name="Data Processing Agreement",
        description="GDPR-compliant handling of personal data",
        fields_class=DPAFields,
        llm_response_class=DPALLMResponse,
        field_descriptions=_DPA_FIELD_DESCRIPTIONS,
        optional_fields={
            "specialCategoryData", "specialCategoryDataRestrictions",
            "frequencyOfTransfer", "approvedSubprocessors", "governingMemberState",
            "securityPolicy", "providerSecurityContact",
        },
    ),
    DocumentType.partnership: DocumentConfig(
        display_name="Partnership Agreement",
        description="Referral, reseller, and technology partnerships",
        fields_class=PartnershipFields,
        llm_response_class=PartnershipLLMResponse,
        field_descriptions=_PARTNERSHIP_FIELD_DESCRIPTIONS,
        optional_fields={
            "generalCapAmount", "paymentProcess", "paymentSchedule",
            "brandGuidelines", "increasedClaims", "increasedCapAmount",
            "unlimitedClaims", "companyCoveredClaim", "partnerCoveredClaims",
            "additionalWarranties", "dpa",
        },
    ),
    DocumentType.pilot: DocumentConfig(
        display_name="Pilot Agreement",
        description="Time-limited evaluation or proof-of-concept",
        fields_class=PilotFields,
        llm_response_class=PilotLLMResponse,
        field_descriptions=_PILOT_FIELD_DESCRIPTIONS,
        optional_fields={"generalCapAmount", "noticeAddress"},
    ),
    DocumentType.psa: DocumentConfig(
        display_name="Professional Services Agreement",
        description="Consulting, implementation, and professional services",
        fields_class=PSAFields,
        llm_response_class=PSALLMResponse,
        field_descriptions=_PSA_FIELD_DESCRIPTIONS,
        optional_fields={
            "generalCapAmount", "customerPolicies", "insuranceMinimums",
            "rejectionPeriod", "resubmissionPeriod", "customerObligations",
            "paymentPeriod", "increasedClaims", "increasedCapAmount",
            "unlimitedClaims", "providerCoveredClaims", "customerCoveredClaims",
            "additionalWarranties", "dpa", "securityPolicy",
        },
    ),
    DocumentType.sla: DocumentConfig(
        display_name="Service Level Agreement",
        description="Uptime commitments and remedies for cloud/SaaS services",
        fields_class=SLAFields,
        llm_response_class=SLALLMResponse,
        field_descriptions=_SLA_FIELD_DESCRIPTIONS,
        optional_fields={"responseTimeCredit", "subscriptionPeriod", "scheduledDowntime"},
    ),
    DocumentType.software_license: DocumentConfig(
        display_name="Software License Agreement",
        description="On-premise or installed software licensing",
        fields_class=SoftwareLicenseFields,
        llm_response_class=SoftwareLicenseLLMResponse,
        field_descriptions=_SOFTWARE_LICENSE_FIELD_DESCRIPTIONS,
        optional_fields={
            "warrantyPeriod", "deletionProcedure", "nonRenewalNoticeDate",
            "generalCapAmount", "increasedClaims", "increasedCapAmount",
            "unlimitedClaims", "providerCoveredClaims", "customerCoveredClaims",
            "additionalWarranties",
        },
    ),
    DocumentType.ai_addendum: DocumentConfig(
        display_name="AI Addendum",
        description="Governs AI features within an existing agreement",
        fields_class=AIAddendumFields,
        llm_response_class=AIAddendumLLMResponse,
        field_descriptions=_AI_ADDENDUM_FIELD_DESCRIPTIONS,
        optional_fields={
            "trainingData", "trainingPurposes", "trainingRestrictions",
            "improvementRestrictions",
        },
    ),
    DocumentType.design_partner: DocumentConfig(
        display_name="Design Partner Agreement",
        description="Early-access product feedback relationships",
        fields_class=DesignPartnerFields,
        llm_response_class=DesignPartnerLLMResponse,
        field_descriptions=_DESIGN_PARTNER_FIELD_DESCRIPTIONS,
        optional_fields={"fees"},
    ),
}


def build_system_prompt(doc_type: DocumentType, current_fields: Any) -> str:
    config = REGISTRY[doc_type]
    return _build_prompt(
        config.display_name,
        config.field_descriptions,
        config.optional_fields,
        current_fields,
    )
