# US-035: Billing Information

## User Story
As a user, I want to manage my billing information including address and tax details so that I can receive accurate invoices and comply with tax regulations.

## Acceptance Criteria
- Users can enter and update billing address
- Support for international addresses
- Users can add tax identification numbers (VAT, GST, etc.)
- Automatic tax calculation based on location
- Users can specify if they're tax-exempt
- Billing contact information separate from account profile
- Users can add company/organization details for invoicing
- Validation of address and tax ID formats
- Option to use same address as account profile

## Technical Requirements
- Address validation and standardization service
- Tax calculation engine integration
- Support for multiple tax jurisdictions
- Database schema for billing entities
- API endpoints for billing information CRUD
- Integration with invoice generation system
- Compliance with regional tax requirements
- Audit trail for billing information changes

## Design Notes
- Smart address autocomplete
- Country-specific form fields
- Clear labeling for optional vs required fields
- Inline validation for tax IDs
- Preview of how information appears on invoices
- Help tooltips for tax-related fields
- Option to save multiple billing profiles
- Clear data privacy messaging

## Dependencies
- Tax calculation service selection
- Address validation service
- Legal review of tax compliance
- Invoice template design
- Regional tax requirement research