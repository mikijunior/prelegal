from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str

    model_config = {"from_attributes": True}


class DocumentType(str, Enum):
    mutual_nda = "mutual_nda"
    baa = "baa"
    csa = "csa"
    dpa = "dpa"
    partnership = "partnership"
    pilot = "pilot"
    psa = "psa"
    sla = "sla"
    software_license = "software_license"
    ai_addendum = "ai_addendum"
    design_partner = "design_partner"


# ── Document persistence schemas (must be below DocumentType) ───────────────


class ProgressInfo(BaseModel):
    required_filled: int
    required_total: int


class DocumentListItem(BaseModel):
    id: int
    document_type: DocumentType
    display_name: str
    progress: ProgressInfo
    updated_at: datetime


class DocumentResponse(BaseModel):
    id: int
    document_type: DocumentType
    fields: dict
    progress: ProgressInfo
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Field schemas ────────────────────────────────────────────────────────────


class NDAFields(BaseModel):
    party1Company: Optional[str] = None
    party1Name: Optional[str] = None
    party1Title: Optional[str] = None
    party1Address: Optional[str] = None
    party1Date: Optional[str] = None
    party2Company: Optional[str] = None
    party2Name: Optional[str] = None
    party2Title: Optional[str] = None
    party2Address: Optional[str] = None
    party2Date: Optional[str] = None
    purpose: Optional[str] = None
    effectiveDate: Optional[str] = None
    mndaTermType: Optional[Literal["expires", "continues"]] = None
    mndaTermYears: Optional[str] = None
    confidentialityTermType: Optional[Literal["period", "perpetuity"]] = None
    confidentialityTermYears: Optional[str] = None
    governingLaw: Optional[str] = None
    jurisdiction: Optional[str] = None
    modifications: Optional[str] = None


class BAAFields(BaseModel):
    provider: Optional[str] = None
    company: Optional[str] = None
    baaEffectiveDate: Optional[str] = None
    agreement: Optional[str] = None
    breachNotificationPeriod: Optional[str] = None
    limitations: Optional[str] = None


class CSAFields(BaseModel):
    provider: Optional[str] = None
    customer: Optional[str] = None
    effectiveDate: Optional[str] = None
    governingLaw: Optional[str] = None
    chosenCourts: Optional[str] = None
    generalCapAmount: Optional[str] = None
    subscriptionPeriod: Optional[str] = None
    orderDate: Optional[str] = None
    technicalSupport: Optional[str] = None
    useLimitations: Optional[str] = None
    paymentProcess: Optional[str] = None
    nonRenewalNoticeDate: Optional[str] = None
    increasedClaims: Optional[str] = None
    increasedCapAmount: Optional[str] = None
    unlimitedClaims: Optional[str] = None
    providerCoveredClaims: Optional[str] = None
    customerCoveredClaims: Optional[str] = None
    additionalWarranties: Optional[str] = None
    dpa: Optional[str] = None


class DPAFields(BaseModel):
    provider: Optional[str] = None
    customer: Optional[str] = None
    agreement: Optional[str] = None
    categoriesOfPersonalData: Optional[str] = None
    categoriesOfDataSubjects: Optional[str] = None
    natureAndPurposeOfProcessing: Optional[str] = None
    durationOfProcessing: Optional[str] = None
    specialCategoryData: Optional[str] = None
    specialCategoryDataRestrictions: Optional[str] = None
    frequencyOfTransfer: Optional[str] = None
    approvedSubprocessors: Optional[str] = None
    governingMemberState: Optional[str] = None
    securityPolicy: Optional[str] = None
    providerSecurityContact: Optional[str] = None


class PartnershipFields(BaseModel):
    company: Optional[str] = None
    partner: Optional[str] = None
    effectiveDate: Optional[str] = None
    governingLaw: Optional[str] = None
    chosenCourts: Optional[str] = None
    obligations: Optional[str] = None
    territory: Optional[str] = None
    endDate: Optional[str] = None
    generalCapAmount: Optional[str] = None
    paymentProcess: Optional[str] = None
    paymentSchedule: Optional[str] = None
    brandGuidelines: Optional[str] = None
    increasedClaims: Optional[str] = None
    increasedCapAmount: Optional[str] = None
    unlimitedClaims: Optional[str] = None
    companyCoveredClaim: Optional[str] = None
    partnerCoveredClaims: Optional[str] = None
    additionalWarranties: Optional[str] = None
    dpa: Optional[str] = None


class PilotFields(BaseModel):
    provider: Optional[str] = None
    customer: Optional[str] = None
    pilotPeriod: Optional[str] = None
    effectiveDate: Optional[str] = None
    governingLaw: Optional[str] = None
    chosenCourts: Optional[str] = None
    generalCapAmount: Optional[str] = None
    noticeAddress: Optional[str] = None


class PSAFields(BaseModel):
    provider: Optional[str] = None
    customer: Optional[str] = None
    effectiveDate: Optional[str] = None
    governingLaw: Optional[str] = None
    chosenCourts: Optional[str] = None
    deliverables: Optional[str] = None
    fees: Optional[str] = None
    sowTerm: Optional[str] = None
    generalCapAmount: Optional[str] = None
    customerPolicies: Optional[str] = None
    insuranceMinimums: Optional[str] = None
    rejectionPeriod: Optional[str] = None
    resubmissionPeriod: Optional[str] = None
    customerObligations: Optional[str] = None
    paymentPeriod: Optional[str] = None
    increasedClaims: Optional[str] = None
    increasedCapAmount: Optional[str] = None
    unlimitedClaims: Optional[str] = None
    providerCoveredClaims: Optional[str] = None
    customerCoveredClaims: Optional[str] = None
    additionalWarranties: Optional[str] = None
    dpa: Optional[str] = None
    securityPolicy: Optional[str] = None


class SLAFields(BaseModel):
    provider: Optional[str] = None
    customer: Optional[str] = None
    parentAgreement: Optional[str] = None
    targetUptime: Optional[str] = None
    targetResponseTime: Optional[str] = None
    supportChannel: Optional[str] = None
    uptimeCredit: Optional[str] = None
    responseTimeCredit: Optional[str] = None
    subscriptionPeriod: Optional[str] = None
    scheduledDowntime: Optional[str] = None


class SoftwareLicenseFields(BaseModel):
    provider: Optional[str] = None
    customer: Optional[str] = None
    effectiveDate: Optional[str] = None
    governingLaw: Optional[str] = None
    chosenCourts: Optional[str] = None
    subscriptionPeriod: Optional[str] = None
    permittedUses: Optional[str] = None
    licenseLimits: Optional[str] = None
    paymentProcess: Optional[str] = None
    orderDate: Optional[str] = None
    warrantyPeriod: Optional[str] = None
    deletionProcedure: Optional[str] = None
    nonRenewalNoticeDate: Optional[str] = None
    generalCapAmount: Optional[str] = None
    increasedClaims: Optional[str] = None
    increasedCapAmount: Optional[str] = None
    unlimitedClaims: Optional[str] = None
    providerCoveredClaims: Optional[str] = None
    customerCoveredClaims: Optional[str] = None
    additionalWarranties: Optional[str] = None


class AIAddendumFields(BaseModel):
    provider: Optional[str] = None
    customer: Optional[str] = None
    parentAgreement: Optional[str] = None
    trainingData: Optional[str] = None
    trainingPurposes: Optional[str] = None
    trainingRestrictions: Optional[str] = None
    improvementRestrictions: Optional[str] = None


class DesignPartnerFields(BaseModel):
    provider: Optional[str] = None
    partner: Optional[str] = None
    effectiveDate: Optional[str] = None
    term: Optional[str] = None
    governingLaw: Optional[str] = None
    chosenCourts: Optional[str] = None
    program: Optional[str] = None
    noticeAddress: Optional[str] = None
    fees: Optional[str] = None


# ── Chat schemas ─────────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(max_length=50)
    document_type: Optional[DocumentType] = None
    current_fields: dict = Field(default_factory=dict)


# ── LLM response schemas (one per document type) ─────────────────────────────


class PreSelectionLLMResponse(BaseModel):
    reply: str
    document_type: Optional[DocumentType] = None


class ChatLLMResponse(BaseModel):
    reply: str
    fields: NDAFields


class BAALLMResponse(BaseModel):
    reply: str
    fields: BAAFields


class CSALLMResponse(BaseModel):
    reply: str
    fields: CSAFields


class DPALLMResponse(BaseModel):
    reply: str
    fields: DPAFields


class PartnershipLLMResponse(BaseModel):
    reply: str
    fields: PartnershipFields


class PilotLLMResponse(BaseModel):
    reply: str
    fields: PilotFields


class PSALLMResponse(BaseModel):
    reply: str
    fields: PSAFields


class SLALLMResponse(BaseModel):
    reply: str
    fields: SLAFields


class SoftwareLicenseLLMResponse(BaseModel):
    reply: str
    fields: SoftwareLicenseFields


class AIAddendumLLMResponse(BaseModel):
    reply: str
    fields: AIAddendumFields


class DesignPartnerLLMResponse(BaseModel):
    reply: str
    fields: DesignPartnerFields
