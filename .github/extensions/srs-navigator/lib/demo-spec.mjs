// Demo CRM System specification for the SRS Navigator canvas
export const DEMO_SPEC = {
  name: "CRM System",
  description: "Customer Relationship Management System Specification",
  version: "1.0",
  problems: [
    { id: "CP.01", title: "Scattered Customer Information", description: "Sales teams waste valuable time searching for customer information across multiple disconnected systems." },
    { id: "CP.02", title: "Missed Follow-ups and Lost Opportunities", description: "Without a systematic way to track interactions, sales reps miss important touchpoints." },
    { id: "CP.03", title: "Lack of Sales Pipeline Visibility", description: "Sales managers have no clear, real-time view of pipeline status or performance metrics." },
    { id: "CP.04", title: "Inefficient Lead Management", description: "New leads from various sources are manually entered with no standardized process." },
    { id: "CP.05", title: "No Customer Communication History", description: "No shared record of previous conversations or commitments across team members." }
  ],
  needs: [
    { id: "CN.01.1", title: "Centralized Customer Database", description: "A single searchable repository for all customer information.", problemIds: ["CP.01", "CP.05"] },
    { id: "CN.02.1", title: "Automated Task and Follow-up Management", description: "Automatic follow-up tasks and reminders based on interactions.", problemIds: ["CP.02"] },
    { id: "CN.03.1", title: "Visual Sales Pipeline Management", description: "Visual deal progression through stages with metrics.", problemIds: ["CP.03"] },
    { id: "CN.04.1", title: "Automated Lead Capture and Routing", description: "Automatic lead capture, qualification, and intelligent routing.", problemIds: ["CP.04"] },
    { id: "CN.05.1", title: "Comprehensive Activity Tracking", description: "Automatic logging of all customer touchpoints.", problemIds: ["CP.05"] },
    { id: "CN.03.2", title: "Real-time Reporting and Analytics", description: "Customizable dashboards with real-time sales metrics.", problemIds: ["CP.03"] },
    { id: "CN.01.2", title: "Mobile Access to Customer Data", description: "Full mobile access with offline capability.", problemIds: ["CP.01", "CP.02"] }
  ],
  functionalRequirements: [
    { id: "FR.01.1.1", title: "Contact and Company Management", description: "Database with hierarchical relationships, custom fields, and search.", needIds: ["CN.01.1"] },
    { id: "FR.05.1.1", title: "Activity Logging Interface", description: "Logging calls, emails, meetings with timeline view.", needIds: ["CN.05.1"] },
    { id: "FR.02.1.1", title: "Task Management System", description: "Tasks with due dates, priorities, and automated creation.", needIds: ["CN.02.1"] },
    { id: "FR.03.1.1", title: "Pipeline Visualization", description: "Kanban-style board with drag-and-drop deal management.", needIds: ["CN.03.1"] },
    { id: "FR.04.1.1", title: "Lead Capture Forms and API", description: "Embeddable forms and REST API for lead submission.", needIds: ["CN.04.1"] },
    { id: "FR.04.1.2", title: "Lead Qualification and Scoring", description: "Scoring system based on attributes and behaviors.", needIds: ["CN.04.1"] },
    { id: "FR.04.1.3", title: "Automated Lead Assignment", description: "Rule engine for lead routing based on criteria.", needIds: ["CN.04.1"] },
    { id: "FR.03.2.1", title: "Dashboard and Reporting Engine", description: "Pre-built widgets and custom report builder.", needIds: ["CN.03.2"] },
    { id: "FR.01.2.1", title: "Mobile Application", description: "Native mobile apps with offline caching.", needIds: ["CN.01.2"] },
    { id: "FR.05.1.2", title: "Email Integration", description: "Two-way email sync with tracking.", needIds: ["CN.05.1", "CN.01.2"] },
    { id: "FR.02.1.2", title: "Calendar Integration", description: "Sync with external calendars.", needIds: ["CN.02.1", "CN.05.1"] },
    { id: "FR.01.1.2", title: "User and Permission Management", description: "Role-based access control with team hierarchies.", needIds: ["CN.01.1", "CN.03.2"] }
  ],
  nonFunctionalRequirements: [
    { id: "NFR.01", title: "Performance", description: "Page load < 2s, search results < 500ms.", needIds: ["CN.01.1", "CN.03.2"] },
    { id: "NFR.02", title: "Security", description: "SOC2 compliance, encryption at rest and in transit.", needIds: ["CN.01.1"] },
    { id: "NFR.03", title: "Scalability", description: "Support 10,000+ concurrent users.", needIds: ["CN.01.1", "CN.04.1"] },
    { id: "NFR.04", title: "Availability", description: "99.9% uptime SLA.", needIds: ["CN.01.2"] },
    { id: "NFR.05", title: "Usability", description: "Intuitive UI requiring < 2hr onboarding.", needIds: ["CN.03.1", "CN.01.2"] }
  ]
};
