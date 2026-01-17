# Example: E-Commerce Checkout Improvement

This example demonstrates the complete Problem-Based SRS methodology applied to improving an e-commerce checkout process.

## Phase 1: Problem Identification

### Stakeholders Identified

| Stakeholder | Role | Key Pain Points | Expected Outcomes |
|-------------|------|-----------------|-------------------|
| Online Shoppers | End Users | Checkout takes too long, cart abandonment | Faster, simpler checkout |
| Customer Support | Internal Team | High volume of payment failure inquiries | Fewer support tickets |
| Sales Team | Internal Team | Lost revenue from abandoned carts | Increased conversion rate |
| Payment Operations | Internal Team | Manual reconciliation of failed payments | Automated payment tracking |

### Identified Problems

#### Problem 1: High Cart Abandonment Rate

- **Problem Statement**: 68% of users abandon their cart during checkout (industry average is 45%)
- **Impact**: Estimated $2M annual revenue loss; affects all 50,000+ monthly shoppers
- **Frequency**: Occurring on every checkout attempt; measured continuously
- **Root Cause**: Multi-page checkout process requires 12 form fields, 4 page loads, and 3-5 minutes to complete. Mobile users face additional friction with form entry.
- **Constraints**: Must maintain PCI compliance; existing payment gateway contract; $150K budget; 3-month timeline
- **Priority**: High

#### Problem 2: Payment Failure Communication Gap

- **Problem Statement**: Users receive generic error messages when payment fails, leading to confusion and support contacts
- **Impact**: 2,000+ support tickets monthly; average 15-minute resolution time; user frustration
- **Frequency**: ~5% of all payment attempts (2,500 monthly)
- **Root Cause**: Payment gateway returns cryptic error codes that aren't translated to user-friendly messages
- **Constraints**: Payment gateway API limitations; support team availability
- **Priority**: Medium

#### Problem 3: Guest Checkout Limitations

- **Problem Statement**: Guest users cannot save their cart or retrieve it later, forcing them to restart
- **Impact**: 40% of shoppers prefer guest checkout but cannot pause their purchase
- **Frequency**: Affects ~20,000 monthly guest users
- **Root Cause**: Guest carts not persisted beyond session; no mechanism for email-based cart retrieval
- **Constraints**: Privacy regulations (GDPR); anonymous session management
- **Priority**: Medium

### Problem Priority Matrix

| Problem | Impact | Urgency | Feasibility | Priority Rank |
|---------|--------|---------|-------------|---------------|
| High Cart Abandonment | High | Critical | Moderate | 1 |
| Payment Failure Communication | Medium | Important | Easy | 2 |
| Guest Checkout Limitations | Medium | Important | Moderate | 3 |

### Recommendation

Address Problem 1 (High Cart Abandonment) as highest priority, with quick win from Problem 2 (Payment Error Messages) as Phase 1.1.

---

## Phase 2: Requirements Elicitation

### Functional Requirements

#### FR-001: One-Page Checkout
**Problem Reference**: PROB-001 (High Cart Abandonment)
**Priority**: Must Have

**Description**: System shall consolidate checkout into a single page that displays cart summary, shipping information, payment details, and order confirmation without requiring page refreshes.

**User Story**:
As an online shopper
I want to complete my purchase on one page
So that I can checkout quickly without multiple page loads

**Acceptance Criteria**:
1. Given I have items in cart, When I click "Checkout", Then all checkout sections display on one page
2. Given I'm on checkout page, When I complete any section, Then page updates without full reload
3. Given I complete checkout, When I submit order, Then confirmation shows on same page
4. Given I'm on mobile device, When I view checkout, Then page is responsive and usable

**Dependencies**: None
**Notes**: Use progressive disclosure to show sections as user completes previous steps

---

#### FR-002: Auto-fill Shipping Information
**Problem Reference**: PROB-001 (High Cart Abandonment)
**Priority**: Should Have

**Description**: System shall auto-populate shipping address fields for returning users who have previously saved their information.

**User Story**:
As a returning customer
I want my shipping address pre-filled
So that I don't have to re-enter the same information

**Acceptance Criteria**:
1. Given I'm a logged-in user with saved address, When I visit checkout, Then shipping address is pre-filled
2. Given I have multiple addresses, When I select different address, Then form updates instantly
3. Given I want new address, When I click "Add new address", Then empty form displays

**Dependencies**: FR-008 (User Address Management)
**Notes**: Must comply with privacy regulations; user should be able to edit or remove saved addresses

---

#### FR-003: Express Payment Options
**Problem Reference**: PROB-001 (High Cart Abandonment)
**Priority**: Should Have

**Description**: System shall support express payment methods (PayPal, Apple Pay, Google Pay) that pre-fill shipping and payment information.

**User Story**:
As a mobile shopper
I want to pay with Apple Pay
So that I can checkout in seconds without entering card details

**Acceptance Criteria**:
1. Given express payment is available, When I click express payment button, Then payment provider authentication launches
2. Given I complete express payment auth, When I return to site, Then order is placed automatically
3. Given express payment fails, When error occurs, Then I see clear error message and can try alternative method

**Dependencies**: Payment gateway integration (external)
**Notes**: Research required for payment provider setup and fees

---

#### FR-004: Enhanced Payment Error Messages
**Problem Reference**: PROB-002 (Payment Failure Communication)
**Priority**: Must Have

**Description**: System shall translate payment gateway error codes into user-friendly messages with specific action steps.

**User Story**:
As a shopper with payment issue
I want to understand why my payment failed
So that I can fix the problem without contacting support

**Acceptance Criteria**:
1. Given payment is declined, When error occurs, Then specific reason displays ("Card expired", "Insufficient funds", etc.)
2. Given error has resolution steps, When error displays, Then action items shown ("Please verify card number", "Contact your bank")
3. Given error is vague, When gateway provides generic error, Then fallback message includes support contact info
4. Given payment fails, When error shows, Then all form data is preserved for retry

**Dependencies**: Payment gateway API documentation
**Notes**: Map all possible gateway error codes to friendly messages

---

#### FR-005: Guest Cart Persistence
**Problem Reference**: PROB-003 (Guest Checkout Limitations)
**Priority**: Could Have

**Description**: System shall allow guest users to save their cart via email and retrieve it later using a secure link.

**User Story**:
As a guest shopper
I want to save my cart and return later
So that I don't lose my selections if I'm not ready to purchase

**Acceptance Criteria**:
1. Given I'm guest user, When I click "Save cart for later", Then email input prompts
2. Given I enter email, When I submit, Then unique cart link sent to email
3. Given I have cart link, When I click link, Then cart contents restore
4. Given cart is saved, When 30 days pass, Then cart expires and data is deleted

**Dependencies**: Email service integration
**Notes**: Security: cart links must be unique, non-guessable, and expire

---

### Non-Functional Requirements

#### NFR-001: Checkout Performance
**Problem Reference**: PROB-001 (High Cart Abandonment)
**Priority**: Must Have

**Description**: Checkout page shall load within 2 seconds on 4G mobile connection and respond to user interactions within 500ms.

**Acceptance Criteria**:
- Lighthouse performance score ≥ 90
- Time to Interactive (TTI) < 2 seconds
- Form field updates < 500ms
- Payment processing acknowledgment < 1 second

---

#### NFR-002: Mobile Responsiveness
**Problem Reference**: PROB-001 (High Cart Abandonment)
**Priority**: Must Have

**Description**: Checkout interface shall be fully functional and optimized for mobile devices (320px - 768px width).

**Acceptance Criteria**:
- All elements accessible on 320px wide screens
- Touch targets minimum 44x44 pixels
- No horizontal scrolling required
- Virtual keyboard doesn't obscure form fields

---

#### NFR-003: PCI DSS Compliance
**Problem Reference**: Payment security requirement
**Priority**: Must Have

**Description**: Payment handling shall comply with PCI DSS Level 1 requirements.

**Acceptance Criteria**:
- No card numbers stored in application database
- Payment tokenization used for recurring charges
- TLS 1.2+ for all payment data transmission
- Annual PCI compliance audit passes

---

#### NFR-004: Accessibility
**Problem Reference**: Legal/inclusivity requirement
**Priority**: Must Have

**Description**: Checkout interface shall conform to WCAG 2.1 AA accessibility standards.

**Acceptance Criteria**:
- Full keyboard navigation support
- Screen reader compatible (tested with NVDA and VoiceOver)
- Color contrast ratios ≥ 4.5:1
- Form field labels and error messages properly associated

---

### Constraints

**Technical Constraints**:
- Must integrate with existing Stripe payment gateway
- Built on React/Node.js stack
- Must work with current PostgreSQL database schema

**Business Constraints**:
- Budget: $150,000
- Timeline: 3 months
- Team: 3 frontend developers, 2 backend developers, 1 designer, 1 QA

**Regulatory Constraints**:
- PCI DSS compliance required
- GDPR compliance for EU customers
- CCPA compliance for California residents

### Assumptions

1. Current user database can be extended for address storage
2. Stripe supports required express payment methods
3. Users have modern browsers (last 2 versions of Chrome, Firefox, Safari, Edge)
4. Email service can handle 5,000+ cart emails daily

### Out of Scope (Phase 2)

- Complete checkout redesign
- Saved payment methods
- Buy now, pay later integration
- Gift card support
- International address validation

---

## Phase 3: Requirements Specification

### Requirements Traceability Matrix

| Req ID | Problem ID | Business Objective | Stakeholder | Priority | Status |
|--------|------------|-------------------|-------------|----------|--------|
| FR-001 | PROB-001 | Reduce cart abandonment | Sales Team | Must Have | Approved |
| FR-002 | PROB-001 | Reduce form friction | Shoppers | Should Have | Approved |
| FR-003 | PROB-001 | Speed up mobile checkout | Shoppers | Should Have | Approved |
| FR-004 | PROB-002 | Reduce support tickets | Support Team | Must Have | Approved |
| FR-005 | PROB-003 | Enable cart persistence | Shoppers | Could Have | Approved |
| NFR-001 | PROB-001 | Improve performance | Shoppers | Must Have | Approved |
| NFR-002 | PROB-001 | Optimize mobile experience | Shoppers | Must Have | Approved |
| NFR-003 | Security | Maintain payment security | Security Team | Must Have | Approved |
| NFR-004 | Legal | Meet accessibility laws | Legal | Must Have | Approved |

---

## Phase 4: Requirements Validation

### Validation Results Summary

| Category | Total | Passed | Issues Found | Critical Issues |
|----------|-------|--------|--------------|-----------------|
| Completeness | 9 | 8 | 1 | 0 |
| Consistency | 9 | 9 | 0 | 0 |
| Correctness | 9 | 9 | 0 | 0 |
| Clarity | 9 | 7 | 2 | 0 |
| Testability | 9 | 9 | 0 | 0 |
| Feasibility | 9 | 8 | 1 | 0 |

### Issues Identified

#### Issue #1: Express Payment Implementation Details Missing
**Type**: Completeness
**Severity**: High
**Requirement(s) Affected**: FR-003

**Description**: Requirement doesn't specify which express payment providers should be supported in initial release (Apple Pay, Google Pay, PayPal all mentioned but not prioritized).

**Impact**: Could lead to scope creep or missed timeline if all are attempted in Phase 1.

**Recommendation**: Specify priority order: Apple Pay (Phase 1), Google Pay (Phase 1.1), PayPal Express (Phase 2).

**Status**: Resolved - Updated FR-003 with phased approach

---

#### Issue #2: Cart Persistence Security Details Vague
**Type**: Clarity
**Severity**: Medium
**Requirement(s) Affected**: FR-005

**Description**: "Secure link" and "non-guessable" are subjective terms without technical specifications.

**Impact**: Implementation might not meet security standards.

**Recommendation**: Specify: "Cart links shall use cryptographically secure random tokens (minimum 128-bit entropy) with HMAC verification."

**Status**: Resolved - Updated FR-005 with technical specifications

---

#### Issue #3: Performance Testing Budget Not Allocated
**Type**: Feasibility
**Severity**: Medium
**Requirement(s) Affected**: NFR-001

**Description**: Requirement specifies performance targets but project budget doesn't include load testing tools or services.

**Impact**: Cannot verify performance requirements are met.

**Recommendation**: Allocate $5K for load testing tools (e.g., k6, BlazeMeter) from overall budget.

**Status**: Resolved - Budget allocated

---

#### Issue #4: Mobile Form Field Obscurement
**Type**: Clarity
**Severity**: Low
**Requirement(s) Affected**: NFR-002

**Description**: "Virtual keyboard doesn't obscure form fields" is ambiguous—some obscurement is unavoidable on small screens.

**Impact**: Minor—likely to be handled correctly by developers but could lead to different interpretations.

**Recommendation**: Clarify: "Page shall auto-scroll to keep active form field visible above virtual keyboard."

**Status**: Resolved - Updated NFR-002

---

### Stakeholder Feedback

#### Sales Team
**Reviewer**: Jane Smith, VP Sales
**Date**: 2024-01-15

**Comments**:
- Excited about one-page checkout and express payment options
- Concerned about 3-month timeline being aggressive

**Approval**: Approved with conditions (regular progress reviews)

---

#### Customer Support
**Reviewer**: Mike Johnson, Support Manager
**Date**: 2024-01-15

**Comments**:
- Enhanced error messages will significantly reduce ticket volume
- Requests dashboard to track common error types

**Approval**: Approved (dashboard added to Phase 2)

---

#### Engineering Team
**Reviewer**: Sarah Lee, Tech Lead
**Date**: 2024-01-16

**Comments**:
- Technical feasibility confirmed for all Must Have requirements
- Express payment integration may need additional research
- Recommends prototyping one-page checkout before full implementation

**Approval**: Approved with conditions (prototype first)

---

### Validation Decision

**Overall Status**: ✅ Conditionally Approved

**Conditions for Final Approval**:
1. ✅ Resolve Issue #1 (Express payment prioritization) - DONE
2. ✅ Resolve Issue #2 (Security specifications) - DONE
3. ✅ Allocate performance testing budget - DONE
4. ✅ Clarify mobile keyboard handling - DONE
5. ⏳ Complete one-page checkout prototype - IN PROGRESS
6. ⏳ Obtain executive sponsor sign-off - PENDING

### Next Steps

1. Complete prototype of one-page checkout (Week 1-2)
2. Validate prototype with 10 users (Week 2)
3. Obtain final executive approval (Week 3)
4. Begin implementation (Week 4+)

---

## Lessons Learned

### What Worked Well
- Problem-first approach identified root causes effectively
- Quantifiable problem statements (68% cart abandonment) built strong business case
- Involving all stakeholders early prevented scope surprises
- Traceability matrix helped maintain focus on solving actual problems

### Challenges Faced
- Initial tendency to jump to solutions before fully analyzing problems
- Balancing "must have" vs "nice to have" required multiple discussions
- Technical feasibility research took longer than expected for express payments

### Recommendations for Similar Projects
- Start with data: gather metrics before problem identification
- Schedule dedicated workshops for each SRS phase
- Include technical architects early in requirements elicitation
- Build in buffer time for research on unfamiliar integrations
- Prototype high-risk features before finalizing requirements

---

## Appendix: Supporting Artifacts

### User Journey Map (Current State)
1. User browses products (2-10 minutes)
2. User adds items to cart (30 seconds per item)
3. User clicks "Checkout" → Page 1: Cart Review (1 minute)
4. User clicks "Continue" → Page 2: Shipping Info (2-3 minutes)
5. User clicks "Continue" → Page 3: Payment Info (2 minutes)
6. User clicks "Place Order" → Page 4: Confirmation (immediate)
**Total: 7-12 minutes, 4 page loads, 12 form fields**

### User Journey Map (Proposed State)
1. User browses products (2-10 minutes)
2. User adds items to cart (30 seconds per item)
3. User clicks "Checkout" → One Page: All sections (2-3 minutes)
4. User clicks "Place Order" → Same Page: Confirmation (immediate)
**Total: 4-8 minutes, 1 page load, 8 form fields (6 auto-filled for returning users)**

### Success Metrics
- Cart abandonment rate: 68% → <55% (target: match industry average)
- Average checkout time: 7 minutes → <3 minutes
- Mobile conversion rate: +15%
- Payment support tickets: 2,000/month → <1,000/month
- Overall revenue impact: +$1M annually (reduced abandonment)

---

This example demonstrates how Problem-Based SRS methodology provides structure and traceability from problems through validation, ensuring requirements solve real business needs.
