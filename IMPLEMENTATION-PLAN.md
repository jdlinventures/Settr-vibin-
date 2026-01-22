# Settr Implementation Plan

## Overview
Build a unified inbox management system for cold email operations on top of Ship Fast boilerplate. Missive-inspired 3-column UI with Gmail OAuth + SMTP/IMAP support.

---

## Phase 1: Database Foundation

### New Models to Create

**`/models/ConnectedEmail.js`**
```javascript
{
  userId: ObjectId (ref: User),
  emailAddress: String,
  provider: 'gmail' | 'smtp',
  oauthTokens: String (encrypted),      // Gmail refresh/access tokens
  smtpConfig: String (encrypted),       // SMTP/IMAP credentials
  status: 'connected' | 'error' | 'disconnected',
  errorMessage: String,
  lastSyncAt: Date,
  centralInboxId: ObjectId (ref: CentralInbox),
  createdAt, updatedAt
}
```

**`/models/CentralInbox.js`**
```javascript
{
  userId: ObjectId (ref: User),         // owner
  name: String,
  description: String,
  teamMembers: [{ userId: ObjectId, role: 'admin' | 'agent' }],
  warmupKeywords: [String],
  createdAt, updatedAt
}
```

**`/models/Email.js`**
```javascript
{
  centralInboxId: ObjectId,
  connectedEmailId: ObjectId,
  threadId: String (indexed),           // Gmail threadId or generated
  messageId: String (unique),
  inReplyTo: String,
  references: [String],
  from: { name, email },
  to: [{ name, email }],
  cc: [{ name, email }],
  subject: String,
  bodyText: String,
  bodyHtml: String,
  receivedAt: Date,
  isRead: Boolean,
  isArchived: Boolean,
  isWarmupFiltered: Boolean,
  isSent: Boolean,                      // true if we sent this
  tags: [ObjectId],
  stageId: ObjectId,
  assignedTo: ObjectId,
  notes: [{ userId, text, createdAt }],
  attachments: [{ filename, mimeType, size, gmailAttachmentId }],
  createdAt, updatedAt
}
// Indexes: centralInboxId, threadId, messageId, receivedAt, isArchived
```

**`/models/Tag.js`**
```javascript
{
  centralInboxId: ObjectId,
  name: String,
  color: String,
  createdAt, updatedAt
}
```

**`/models/Stage.js`**
```javascript
{
  centralInboxId: ObjectId,
  name: String,
  color: String,
  order: Number,
  isDefault: Boolean,
  createdAt, updatedAt
}
```

**`/models/Draft.js`**
```javascript
{
  userId: ObjectId,
  centralInboxId: ObjectId,
  replyToEmailId: ObjectId,
  sendFromEmailId: ObjectId,            // which ConnectedEmail to send from
  to: [{ name, email }],
  cc: [{ name, email }],
  subject: String,
  bodyHtml: String,
  lastSavedAt: Date,
  createdAt, updatedAt
}
```

### Utility Files

**`/libs/encryption.js`**
- AES-256-GCM encryption/decryption
- Uses `ENCRYPTION_KEY` env variable
- Functions: `encrypt(plaintext)`, `decrypt(ciphertext)`

---

## Phase 2: Gmail OAuth & Email Connection

### Google Cloud Setup (Manual)
1. Create project in Google Cloud Console
2. Enable Gmail API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (Web application)
5. Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`
6. Set redirect URI: `{domain}/api/auth/gmail/callback`

### Files to Create

**`/libs/gmail.js`**
- Gmail API client wrapper using `googleapis`
- Functions:
  - `getAuthUrl(userId)` - Generate OAuth URL with state
  - `handleCallback(code)` - Exchange code for tokens
  - `refreshTokens(connectedEmail)` - Refresh expired tokens
  - `fetchEmails(connectedEmail, since)` - Fetch emails since date
  - `fetchEmailContent(connectedEmail, messageId)` - Get full email
  - `sendEmail(connectedEmail, { to, cc, subject, body, threadId })`
  - `fetchAttachment(connectedEmail, messageId, attachmentId)`

**`/libs/imap.js`**
- IMAP client wrapper using `imap` package
- Functions:
  - `testConnection(config)` - Verify SMTP/IMAP credentials
  - `fetchEmails(config, since)` - Fetch emails via IMAP
  - `parseEmail(raw)` - Parse raw email to structured format

**`/libs/smtp.js`**
- SMTP client using `nodemailer`
- Functions:
  - `sendEmail(config, { to, cc, subject, body, inReplyTo, references })`

### API Routes

**`/api/emails/connect/gmail/route.js`** - POST
- Generate Gmail OAuth URL
- Store state in session for verification
- Return: `{ authUrl }`

**`/api/auth/gmail/callback/route.js`** - GET
- Handle OAuth callback
- Exchange code for tokens
- Create ConnectedEmail record (encrypted tokens)
- Redirect to dashboard

**`/api/emails/connect/smtp/route.js`** - POST
- Accept: `{ email, imapHost, imapPort, smtpHost, smtpPort, username, password }`
- Test IMAP connection
- Test SMTP connection
- Create ConnectedEmail record (encrypted config)
- Return: `{ success, connectedEmailId }`

**`/api/emails/[id]/route.js`** - GET, DELETE
- GET: Return ConnectedEmail details (without decrypted creds)
- DELETE: Remove connection, optionally delete synced emails

**`/api/emails/[id]/test/route.js`** - POST
- Test connection health
- Update status field
- Return: `{ status, error? }`

---

## Phase 3: Central Inbox & Email Syncing

### API Routes

**`/api/central-inboxes/route.js`** - GET, POST
- GET: List user's central inboxes
- POST: Create new central inbox

**`/api/central-inboxes/[id]/route.js`** - GET, PUT, DELETE
- CRUD for single central inbox

**`/api/central-inboxes/[id]/assign-email/route.js`** - POST
- Assign a ConnectedEmail to this central inbox
- Trigger initial sync for that email

### Email Sync Engine

**`/libs/sync.js`**
- Main sync orchestrator
- Functions:
  - `syncAllEmails()` - Sync all connected emails (for cron)
  - `syncConnectedEmail(connectedEmailId)` - Sync single inbox
  - `processEmail(rawEmail, connectedEmail)` - Parse, dedupe, store
  - `applyWarmupFilter(email, keywords)` - Check warmup keywords
  - `mergeThread(email, centralInboxId)` - Handle cross-inbox threading

**Threading Logic:**
1. Gmail emails: Use `threadId` directly
2. SMTP emails: Generate threadId from `Subject + References[0]`
3. Cross-inbox merge: When same threadId exists, link emails together

**`/api/sync/route.js`** - POST (protected, internal)
- Trigger manual sync for all user's connected emails
- Called by cron job or manual refresh

**`/api/cron/sync/route.js`** - GET (Vercel Cron)
- Triggered every 2 minutes
- Calls `syncAllEmails()` for all users with connected emails

### vercel.json (cron config)
```json
{
  "crons": [{
    "path": "/api/cron/sync",
    "schedule": "*/2 * * * *"
  }]
}
```

---

## Phase 4: Unified Inbox UI

### Page Structure

```
/app/dashboard/
├── page.js                    # Redirect to first central inbox or onboarding
├── inbox/
│   └── [centralInboxId]/
│       └── page.js            # Main 3-column inbox view
├── settings/
│   ├── page.js                # General settings
│   ├── emails/page.js         # Manage connected emails
│   ├── team/page.js           # Team members
│   └── billing/page.js        # Subscription (Ship Fast has this)
└── onboarding/
    └── page.js                # Guided setup wizard
```

### Components to Build

**Layout Components:**
- `InboxLayout.js` - 3-column responsive layout
- `Sidebar.js` - Left column: inbox selector, filters, tags, stages
- `EmailList.js` - Center column: email/thread list with infinite scroll
- `EmailDetail.js` - Right column: email content + reply composer

**Email Components:**
- `EmailListItem.js` - Single row in email list (subject, sender, preview, tags)
- `ThreadView.js` - Expanded thread showing all messages
- `EmailMessage.js` - Single email message in thread
- `ReplyComposer.js` - Inline rich text composer (TipTap)
- `AttachmentPreview.js` - Attachment display with download

**Filter/Organization:**
- `TagBadge.js` - Colored tag pill
- `TagSelector.js` - Multi-select tag picker
- `StageDropdown.js` - Stage selector
- `FilterBar.js` - Quick filters (unread, assigned to me, etc.)
- `SearchInput.js` - Full-text search

**Settings Components:**
- `ConnectedEmailCard.js` - Email connection with status indicator
- `AddGmailButton.js` - Start Gmail OAuth flow
- `AddSmtpForm.js` - SMTP/IMAP configuration form
- `TeamMemberList.js` - Team management
- `InviteTeamMember.js` - Invite form

**Onboarding:**
- `OnboardingWizard.js` - Multi-step setup flow
- `Step1ConnectEmail.js` - Connect first email
- `Step2CreateInbox.js` - Create first central inbox
- `Step3InviteTeam.js` - Optional team invite

### API Routes for UI

**`/api/inbox/[centralInboxId]/emails/route.js`** - GET
- Paginated email list (cursor-based for infinite scroll)
- Query params: `cursor`, `limit`, `filter`, `tag`, `stage`, `search`, `unreadOnly`
- Returns: `{ emails, nextCursor, hasMore }`

**`/api/inbox/[centralInboxId]/threads/[threadId]/route.js`** - GET
- Full thread with all messages
- Returns: `{ thread: { emails: [], tags, stage, assignedTo } }`

**`/api/inbox/[centralInboxId]/emails/[emailId]/route.js`** - PATCH
- Update email: `{ isRead, isArchived, tags, stageId, assignedTo }`

**`/api/inbox/[centralInboxId]/emails/[emailId]/notes/route.js`** - POST
- Add internal note to email

**`/api/inbox/[centralInboxId]/emails/bulk/route.js`** - POST
- Bulk actions: `{ emailIds, action, value }`
- Actions: archive, tag, untag, setStage, assign

---

## Phase 5: Tags & Stages

### API Routes

**`/api/central-inboxes/[id]/tags/route.js`** - GET, POST
- List and create tags for central inbox

**`/api/central-inboxes/[id]/tags/[tagId]/route.js`** - PUT, DELETE
- Update/delete tag

**`/api/central-inboxes/[id]/stages/route.js`** - GET, POST
- List and create stages
- POST creates with next `order` value

**`/api/central-inboxes/[id]/stages/[stageId]/route.js`** - PUT, DELETE
- Update/delete stage

**`/api/central-inboxes/[id]/stages/reorder/route.js`** - POST
- Reorder stages: `{ stageIds: ['id1', 'id2', ...] }`

### Default Stages (created with new Central Inbox)
1. New (default)
2. Interested
3. Meeting Booked
4. Not Interested
5. No Response

---

## Phase 6: Reply Functionality

### Components

**`ReplyComposer.js`** (using TipTap)
- Rich text editing (bold, italic, links, lists)
- Sender selector dropdown (pick which ConnectedEmail to send from)
- To/CC fields (pre-filled for replies)
- Subject (editable, pre-filled with "Re: ...")
- Auto-save draft every 5 seconds
- Send button with loading state
- Discard draft button

### API Routes

**`/api/drafts/route.js`** - GET, POST
- GET: List user's drafts
- POST: Create/update draft (upsert by replyToEmailId)

**`/api/drafts/[id]/route.js`** - GET, DELETE
- GET: Load draft for editing
- DELETE: Discard draft

**`/api/send/route.js`** - POST
- Accept: `{ draftId }` or `{ sendFromEmailId, to, cc, subject, body, replyToEmailId }`
- Send via Gmail API or SMTP based on provider
- Create Email record with `isSent: true`
- Delete draft if exists
- Return: `{ success, emailId }`

### Send Flow
1. User composes reply in `ReplyComposer`
2. Auto-save creates/updates Draft every 5s
3. User clicks Send
4. POST to `/api/send` with draft content
5. Server sends via appropriate provider
6. On success: Delete draft, create Email record, update UI
7. On failure: Keep draft, show error toast

---

## Phase 7: Team Collaboration

### API Routes

**`/api/central-inboxes/[id]/team/route.js`** - GET, POST
- GET: List team members with roles
- POST: Invite team member by email

**`/api/central-inboxes/[id]/team/[userId]/route.js`** - PUT, DELETE
- PUT: Change role
- DELETE: Remove from team

**`/api/invitations/route.js`** - GET
- List pending invitations for current user

**`/api/invitations/[id]/accept/route.js`** - POST
- Accept invitation, add user to central inbox team

### Invitation Flow
1. Admin invites user by email
2. If user exists: Add to team immediately, send notification email
3. If user doesn't exist: Create invitation record, send invite email
4. New user signs up → Check for pending invitations → Auto-add to teams

### Notifications

**`/models/Notification.js`**
```javascript
{
  userId: ObjectId,
  type: 'assignment' | 'mention' | 'invitation',
  title: String,
  body: String,
  link: String,
  isRead: Boolean,
  createdAt
}
```

**`/api/notifications/route.js`** - GET
- List user's notifications (paginated)

**`/api/notifications/[id]/read/route.js`** - POST
- Mark notification as read

### Browser Push Notifications
- Use Web Push API
- Store push subscription in User model
- Send push when: new email arrives, assigned email, invitation

---

## Phase 8: Search, Filters & Polish

### Search Implementation
- MongoDB text index on Email: `{ subject: 'text', bodyText: 'text', 'from.email': 'text' }`
- Full-text search via `$text` query
- Combine with filters (tags, stages, date range, etc.)

### Keyboard Shortcuts
Implement in `InboxLayout.js` using `useEffect` + `keydown` listener:
- `j` / `k` - Navigate up/down in email list
- `o` / `Enter` - Open selected email
- `e` - Archive
- `r` - Reply
- `l` - Add label/tag
- `s` - Change stage
- `/` - Focus search
- `?` - Show shortcuts modal

### Warmup Filter
- Stored as `warmupKeywords: [String]` in CentralInbox
- During sync: Check subject + body against keywords (case-insensitive)
- If match: Set `isWarmupFiltered: true`
- UI: Toggle to show/hide warmup-filtered emails

### Mobile Responsiveness
- < 768px: Show only email list, tap to view detail (slide-in panel)
- 768px - 1024px: Hide sidebar, show list + detail
- > 1024px: Full 3-column layout

---

## Phase 9: Onboarding Wizard

### Flow
1. **Welcome** - Brief product intro
2. **Connect Email** - Gmail OAuth button + SMTP option
3. **Create Central Inbox** - Name your first inbox
4. **Assign Email** - Link connected email to inbox
5. **Invite Team** (optional) - Skip or invite teammates
6. **Done** - Redirect to inbox

### Implementation
- Store onboarding progress in User model: `onboardingStep: Number`
- `/dashboard` checks if `onboardingStep < 5`, redirects to `/dashboard/onboarding`
- Each step updates `onboardingStep` on completion

---

## File Structure Summary

```
/app
├── dashboard/
│   ├── page.js
│   ├── layout.js (with sidebar)
│   ├── inbox/[centralInboxId]/page.js
│   ├── settings/
│   │   ├── page.js
│   │   ├── emails/page.js
│   │   └── team/page.js
│   └── onboarding/page.js
├── api/
│   ├── emails/
│   │   ├── connect/gmail/route.js
│   │   ├── connect/smtp/route.js
│   │   └── [id]/route.js
│   ├── auth/gmail/callback/route.js
│   ├── central-inboxes/
│   │   ├── route.js
│   │   └── [id]/
│   │       ├── route.js
│   │       ├── assign-email/route.js
│   │       ├── tags/route.js
│   │       ├── stages/route.js
│   │       └── team/route.js
│   ├── inbox/[centralInboxId]/
│   │   ├── emails/route.js
│   │   ├── threads/[threadId]/route.js
│   │   └── emails/[emailId]/route.js
│   ├── drafts/route.js
│   ├── send/route.js
│   ├── sync/route.js
│   ├── cron/sync/route.js
│   ├── notifications/route.js
│   └── invitations/route.js

/components
├── inbox/
│   ├── InboxLayout.js
│   ├── Sidebar.js
│   ├── EmailList.js
│   ├── EmailListItem.js
│   ├── EmailDetail.js
│   ├── ThreadView.js
│   ├── ReplyComposer.js
│   ├── TagBadge.js
│   ├── TagSelector.js
│   ├── StageDropdown.js
│   ├── FilterBar.js
│   └── SearchInput.js
├── settings/
│   ├── ConnectedEmailCard.js
│   ├── AddGmailButton.js
│   ├── AddSmtpForm.js
│   └── TeamMemberList.js
└── onboarding/
    ├── OnboardingWizard.js
    └── steps/

/libs
├── encryption.js
├── gmail.js
├── imap.js
├── smtp.js
└── sync.js

/models
├── ConnectedEmail.js
├── CentralInbox.js
├── Email.js
├── Tag.js
├── Stage.js
├── Draft.js
└── Notification.js
```

---

## Environment Variables to Add

```
# Gmail OAuth (separate from login)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=

# Encryption
ENCRYPTION_KEY=          # 32-byte hex string for AES-256

# Web Push (optional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

---

## Dependencies to Install

```bash
npm install googleapis          # Gmail API
npm install imap                # IMAP client
npm install mailparser          # Parse raw emails
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link  # Rich text editor
npm install web-push            # Browser notifications
```

---

## Build Order

1. **Phase 1:** Models + encryption (foundation)
2. **Phase 2:** Gmail OAuth + SMTP connection
3. **Phase 3:** Central inbox CRUD + email syncing
4. **Phase 4:** Inbox UI (3-column layout, email list, detail view)
5. **Phase 5:** Tags & stages
6. **Phase 6:** Reply composer + sending
7. **Phase 7:** Team collaboration
8. **Phase 8:** Search, filters, keyboard shortcuts
9. **Phase 9:** Onboarding wizard

---

## Verification

After each phase, verify:

1. **Phase 1:** Models create documents in MongoDB correctly
2. **Phase 2:** Can connect Gmail account, see it in database with encrypted tokens
3. **Phase 3:** Emails sync from Gmail, appear in database
4. **Phase 4:** Can view emails in 3-column UI, click to see detail
5. **Phase 5:** Can create/apply tags and stages
6. **Phase 6:** Can compose and send reply, appears in thread
7. **Phase 7:** Can invite team member, they can access inbox
8. **Phase 8:** Search returns results, keyboard shortcuts work
9. **Phase 9:** New user goes through onboarding flow

**End-to-end test:**
1. Sign up as new user
2. Complete onboarding (connect Gmail, create inbox)
3. See emails sync into inbox
4. Apply tag and change stage
5. Reply to an email
6. Invite teammate
7. Teammate logs in and can see shared inbox
