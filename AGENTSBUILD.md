# AGENTSBUILD.md — Kindy-Mate AI Build Guide

## 0. Purpose of this File

This file is a build specification for developers and AI coding agents working on the Kindy-Mate repository.

It explains:

- How the app should be built
- How the backend and frontend should be structured
- How the database should be designed
- How the reward system should work
- How AI features should be integrated safely
- How parent control and child safety should be implemented
- What should be included in the MVP
- What should be avoided

This file complements `AGENTS.md`.

`AGENTS.md` explains the product vision, child-safety principles, SDG alignment, and ethical boundaries.

`AGENTSBUILD.md` explains the technical implementation plan.

The repository currently follows this high-level structure:

```text
KINDY-MATE/
├── .github/
├── .venv/
├── backend/
│   ├── .venv/
│   ├── apps/
│   ├── config/
│   ├── scripts/
│   ├── .python-version
│   ├── manage.py
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/
│   ├── .next/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   ├── .gitignore
│   ├── eslint.config.mjs
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── postcss.config.mjs
│   └── tsconfig.json
├── .env
├── .env.example
├── .gitignore
├── AGENTS.md
├── docker-compose.prod.yml
├── docker-compose.yml
└── README.md
```

The backend appears to be a Python web backend, likely Django because of `manage.py`, `apps/`, and `config/`.

The frontend appears to be a Next.js TypeScript app using pnpm.

Unless explicitly changed, build the app using:

- Backend: Django + Django REST Framework
- Database: PostgreSQL for production, SQLite acceptable only for local demo if already configured
- Frontend: Next.js + TypeScript
- Containerization: Docker Compose
- AI integrations: API-based for demo, safer/local-first design for future production

## 1. Product Summary for Developers

Kindy-Mate AI is a parent-led, AI-supported child development platform.

The app converts children’s existing passive screen time into structured activities:

- Learning
- Reading
- Movement
- Creative tasks
- Light reflection
- Limited healthy entertainment
- Mascot customization

The app uses a child-safe reward economy:

- Children earn points by completing useful activities.
- Children spend points on limited entertainment or mascot customization.
- Parent settings always override child points.
- AI supports mission generation, feedback, reading support, movement verification, and parent analytics.

The app must never become:

- An AI babysitter
- A free-chat companion
- A generic chatbot for kids
- A platform that encourages unlimited screen time
- A game designed around addictive reward loops
- A replacement for parents, teachers, doctors, or therapists

Core implementation principle:

> AI is the personalization and safety layer. Content is the intervention. Parent control is the governance. SDG impact is the purpose.

## 2. MVP Build Priorities

Build the MVP in this order.

### Priority 1 — Core Product

1. Parent authentication
2. Parent-led onboarding
3. Child profile creation
4. Parent rules and daily caps
5. Curated content bank
6. Growth mission system
7. Reward wallet and transactions
8. Spend points on entertainment/customization
9. Parent dashboard
10. Basic safety restrictions

### Priority 2 — AI Assistance

1. AI mission generation from predefined templates
2. AI child-friendly explanations from approved content
3. AI weekly parent summary
4. Basic moderation/filtering
5. Optional speech recognition demo
6. Optional movement verification demo

### Priority 3 — Engagement Layer

1. Mascot UI
2. Mascot customization
3. Cosmetic item shop using points only
4. Cooldown timers
5. Diminishing returns
6. Balanced mission requirements

### Priority 4 — Future/Advanced

1. On-device speech recognition
2. On-device computer vision
3. RAG over approved content
4. Licensed educational content partnerships
5. Advanced adaptive learning
6. School/teacher mode
7. Multi-child dashboard
8. Offline mode

Do not prioritize free-form mascot chat.

Do not prioritize flashy game mechanics before parent control and safety.

## 3. Suggested Backend App Structure

Inside `backend/apps/`, create or maintain separate Django apps by business domain.

Recommended structure:

```text
backend/apps/
├── accounts/
├── children/
├── content/
├── missions/
├── rewards/
├── entertainment/
├── mascot/
├── parent_dashboard/
├── ai_services/
├── safety/
└── analytics/
```

### 3.1 `accounts`

Responsible for:

- Parent account registration
- Parent login/logout
- Password management
- Parent consent status
- Role management
- Authentication tokens/session handling

Important:

- The first account must be a parent/guardian account.
- Children should not have independent login credentials in the MVP.
- Child mode should be accessed through a parent-created child profile.

### 3.2 `children`

Responsible for:

- Child profiles
- Age and nickname
- Avatar selection
- Interests
- Parent ownership
- Child-specific settings

Important:

- Do not require real child name.
- Do not require child photo.
- Use nickname and avatar by default.

### 3.3 `content`

Responsible for:

- Curated content bank
- Learning content
- Reading content
- Movement content
- Entertainment content
- Documentary content
- Content metadata
- Age range
- Difficulty
- Stimulation level
- License status
- Approval status

Important:

- AI should pull from this curated content bank.
- Do not allow AI to freely invent core educational content without review.

### 3.4 `missions`

Responsible for:

- Mission templates
- Mission instances
- Mission attempts
- Mission verification
- Mission completion
- Points awarded
- Mission category balance

Mission types:

- learning
- reading
- movement
- creative
- reflection

### 3.5 `rewards`

Responsible for:

- Reward wallets
- Point balances
- Earn transactions
- Spend transactions
- Adjustments by parents
- Anti-abuse rules
- Daily cap enforcement

Important:

- Points cannot override parent rules.
- Points cannot unlock entertainment beyond daily cap.

### 3.6 `entertainment`

Responsible for:

- Entertainment sessions
- Point spending
- Session durations
- Cooldowns
- Parent-approved entertainment items
- Session start/stop tracking

Important:

- No infinite scroll.
- No autoplay chains.
- No uncontrolled external feeds.

### 3.7 `mascot`

Responsible for:

- Mascot base character
- Mascot customization items
- Outfits
- Accessories
- Backgrounds
- Purchased/unlocked items
- Active customization state

Important:

- Mascot must not use emotional manipulation.
- Mascot items must not use loot boxes or random reward mechanics.

### 3.8 `parent_dashboard`

Responsible for:

- Parent-facing summaries
- Daily/weekly reports
- Usage charts
- Rule editing
- Alerts
- Child progress overview
- Content approval queue

### 3.9 `ai_services`

Responsible for:

- LLM integration
- Prompt templates
- Mission generation
- Explanation generation
- Parent summary generation
- Speech recognition integration
- Computer vision integration
- AI provider abstraction

Important:

- Keep provider logic separated from business logic.
- Use service classes so the AI provider can be swapped later.

### 3.10 `safety`

Responsible for:

- Input filtering
- Output filtering
- PII detection
- Blocked topic rules
- Age-based restrictions
- Child-safe fallback responses
- Moderation logs

### 3.11 `analytics`

Responsible for:

- Learning time calculation
- Reading time calculation
- Movement time calculation
- Entertainment time calculation
- Passive/active balance
- Repeated mission detection
- Overuse pattern detection
- Parent recommendations

## 4. Suggested Frontend Structure

Inside `frontend/src/`, use a modular structure.

Recommended structure:

```text
frontend/src/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── parent/
│   ├── child/
│   ├── auth/
│   └── onboarding/
├── components/
│   ├── common/
│   ├── parent/
│   ├── child/
│   ├── mascot/
│   ├── missions/
│   ├── rewards/
│   ├── dashboard/
│   └── safety/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── constants.ts
│   ├── validators.ts
│   └── utils.ts
├── types/
├── hooks/
├── stores/
└── styles/
```

### 4.1 Parent-facing routes

Suggested routes:

```text
/parent/dashboard
/parent/children
/parent/children/[childId]
/parent/rules
/parent/content-approval
/parent/reports
/parent/settings
```

### 4.2 Child-facing routes

Suggested routes:

```text
/child/select-profile
/child/[childId]/home
/child/[childId]/missions
/child/[childId]/mission/[missionId]
/child/[childId]/rewards
/child/[childId]/entertainment
/child/[childId]/mascot
```

### 4.3 Auth/onboarding routes

Suggested routes:

```text
/auth/login
/auth/register
/onboarding/parent
/onboarding/child-profile
/onboarding/rules
```

## 5. Database Design

Use PostgreSQL for the main database.

All timestamps should use timezone-aware datetime fields.

Use soft deletion for child-related data where appropriate, but allow full deletion on parent request.

### 5.1 Parent User

Model: `ParentUser`

Suggested fields:

```text
id: UUID primary key
email: unique string
password_hash: string, if not using built-in auth directly
full_name: optional string
consent_status: boolean
consent_timestamp: datetime nullable
is_active: boolean
created_at: datetime
updated_at: datetime
```

If using Django built-in user model, create a custom user model early to avoid migration problems later.

Recommended:

- `AUTH_USER_MODEL = 'accounts.User'`
- User role: parent/admin/staff

### 5.2 Child Profile

Model: `ChildProfile`

Suggested fields:

```text
id: UUID primary key
parent: FK to ParentUser
nickname: string
age: integer
avatar_id: string nullable
interests: JSON/list nullable
default_language: string, e.g. 'en', 'vi'
voice_enabled: boolean default false
camera_enabled: boolean default false
is_active: boolean
created_at: datetime
updated_at: datetime
```

Rules:

- Do not require real name.
- Do not require real photo.
- Age is required because content and mission difficulty depend on age.

### 5.3 Parent Rule

Model: `ParentRule`

Suggested fields:

```text
id: UUID primary key
child: OneToOne FK to ChildProfile
daily_entertainment_cap_minutes: integer
bedtime_lock_start: time nullable
bedtime_lock_end: time nullable
allowed_content_categories: JSON/list
point_conversion_rate: integer or decimal
cooldown_minutes: integer
max_sessions_per_day: integer nullable
require_balanced_missions: boolean default true
allow_voice: boolean default false
allow_camera: boolean default false
allow_external_video: boolean default false
created_at: datetime
updated_at: datetime
```

Important:

- ParentRule must be checked before any entertainment session starts.
- ParentRule must override RewardWallet balance.

### 5.4 Content Item

Model: `ContentItem`

Suggested fields:

```text
id: UUID primary key
title: string
description: text nullable
content_type: enum
age_min: integer
age_max: integer
difficulty_level: enum/string
estimated_duration_minutes: integer
stimulation_level: enum: low, medium, high
requires_audio: boolean
requires_camera: boolean
requires_parent_approval: boolean
source_name: string
source_url: string nullable
license_status: enum: internal, open_license, licensed, demo_only, unknown
approval_status: enum: approved, pending, rejected
learning_objective: text nullable
related_sdg: JSON/list nullable
content_body: text nullable
media_url: string nullable
safety_notes: text nullable
created_at: datetime
updated_at: datetime
```

Content types:

```text
learning
reading
movement
creative
reflection
entertainment
documentary
mascot_item
```

Important:

- Do not serve content with `approval_status != approved` to children.
- Do not serve `license_status = unknown` in production.
- Demo-only content must be clearly marked.

### 5.5 Mission Template

Model: `MissionTemplate`

Suggested fields:

```text
id: UUID primary key
mission_type: enum: learning, reading, movement, creative, reflection
title: string
instruction_template: text
age_min: integer
age_max: integer
difficulty_level: string
base_points_reward: integer
estimated_duration_minutes: integer
source_content: FK to ContentItem nullable
requires_voice: boolean
requires_camera: boolean
is_ai_generated_allowed: boolean default false
is_active: boolean
created_at: datetime
updated_at: datetime
```

### 5.6 Mission Instance

Model: `MissionInstance`

A generated/assigned mission for a specific child.

Suggested fields:

```text
id: UUID primary key
child: FK to ChildProfile
mission_template: FK to MissionTemplate nullable
mission_type: enum
title: string
instruction: text
content_item: FK to ContentItem nullable
points_reward: integer
status: enum: available, started, completed, expired, skipped
assigned_at: datetime
expires_at: datetime nullable
created_by: enum: system, ai, parent
created_at: datetime
updated_at: datetime
```

### 5.7 Mission Attempt

Model: `MissionAttempt`

Suggested fields:

```text
id: UUID primary key
child: FK to ChildProfile
mission_instance: FK to MissionInstance
status: enum: started, completed, failed, skipped
score: decimal nullable
points_awarded: integer
verification_method: enum: manual, quiz, speech, cv, parent_confirmed, system
started_at: datetime
completed_at: datetime nullable
metadata: JSON nullable
created_at: datetime
updated_at: datetime
```

Metadata examples:

```json
{
  "quiz_correct": 3,
  "quiz_total": 5,
  "movement_reps": 10,
  "speech_confidence": 0.82
}
```

Do not store raw audio/video here.

### 5.8 Reward Wallet

Model: `RewardWallet`

Suggested fields:

```text
id: UUID primary key
child: OneToOne FK to ChildProfile
points_balance: integer
points_earned_total: integer
points_spent_total: integer
created_at: datetime
updated_at: datetime
```

### 5.9 Reward Transaction

Model: `RewardTransaction`

Suggested fields:

```text
id: UUID primary key
wallet: FK to RewardWallet
child: FK to ChildProfile
transaction_type: enum: earn, spend, adjustment, refund
points_amount: integer
reason: string
source_type: enum: mission, entertainment, mascot_item, parent_adjustment, system
source_id: UUID nullable
created_at: datetime
```

Rules:

- Earn transactions are positive.
- Spend transactions are negative.
- Never mutate balance without recording a transaction.
- Use database transactions/locks to prevent race conditions.

### 5.10 Entertainment Session

Model: `EntertainmentSession`

Suggested fields:

```text
id: UUID primary key
child: FK to ChildProfile
content_item: FK to ContentItem nullable
session_type: enum: video, game, documentary, calm_activity
points_spent: integer
duration_minutes_allowed: integer
duration_minutes_actual: integer nullable
status: enum: scheduled, active, completed, stopped, blocked
started_at: datetime nullable
ended_at: datetime nullable
blocked_reason: string nullable
created_at: datetime
updated_at: datetime
```

Rules:

- Before starting, check points balance.
- Before starting, check daily entertainment cap.
- Before starting, check cooldown.
- Before starting, check bedtime lock.
- Before starting, check content approval.

### 5.11 Mascot Item

Model: `MascotItem`

Suggested fields:

```text
id: UUID primary key
name: string
item_type: enum: outfit, accessory, background, pet, room, badge, superhero_item
age_min: integer
age_max: integer
points_cost: integer
image_url: string
is_active: boolean
is_random_reward: boolean default false
created_at: datetime
updated_at: datetime
```

Rule:

- `is_random_reward` must remain false for child-facing MVP.
- No loot boxes.

### 5.12 Child Mascot Inventory

Model: `ChildMascotInventory`

Suggested fields:

```text
id: UUID primary key
child: FK to ChildProfile
item: FK to MascotItem
unlocked_at: datetime
source_transaction: FK to RewardTransaction nullable
```

### 5.13 Active Mascot Customization

Model: `ActiveMascotCustomization`

Suggested fields:

```text
id: UUID primary key
child: OneToOne FK to ChildProfile
active_outfit: FK to MascotItem nullable
active_accessory: FK to MascotItem nullable
active_background: FK to MascotItem nullable
active_pet: FK to MascotItem nullable
updated_at: datetime
```

### 5.14 Usage Event

Model: `UsageEvent`

Suggested fields:

```text
id: UUID primary key
child: FK to ChildProfile
event_type: string
event_category: enum: learning, reading, movement, entertainment, mascot, parent, safety, ai
content_item: FK nullable
mission_attempt: FK nullable
duration_seconds: integer nullable
metadata: JSON nullable
created_at: datetime
```

Use this for analytics.

Avoid logging sensitive raw messages from children unless necessary and consented.

### 5.15 Parent Alert

Model: `ParentAlert`

Suggested fields:

```text
id: UUID primary key
parent: FK to ParentUser
child: FK to ChildProfile
alert_type: enum
severity: enum: info, warning, urgent
message: text
is_read: boolean
created_at: datetime
```

Alert types:

```text
entertainment_cap_reached
bedtime_attempt
repeated_unlock_attempt
high_passive_ratio
low_movement_activity
reading_skipped
out_of_scope_ai_prompt
permission_request
content_approval_required
```

### 5.16 AI Interaction Log

Model: `AIInteractionLog`

Use carefully.

Suggested fields:

```text
id: UUID primary key
child: FK nullable
parent: FK nullable
interaction_type: enum: mission_generation, explanation, parent_summary, safety_fallback
provider: string
input_summary: text nullable
output_summary: text nullable
safety_status: enum: allowed, blocked, redacted
created_at: datetime
```

Important:

- Do not store raw child personal conversations by default.
- Prefer summaries or redacted logs.
- Store enough for debugging and safety auditing, but avoid surveillance.

## 6. Core API Endpoints

Use REST API unless the project explicitly chooses GraphQL.

Base path suggestion:

```text
/api/v1/
```

### 6.1 Auth

```text
POST /api/v1/auth/register-parent/
POST /api/v1/auth/login/
POST /api/v1/auth/logout/
GET  /api/v1/auth/me/
```

### 6.2 Child Profiles

```text
GET    /api/v1/children/
POST   /api/v1/children/
GET    /api/v1/children/{child_id}/
PATCH  /api/v1/children/{child_id}/
DELETE /api/v1/children/{child_id}/
```

### 6.3 Parent Rules

```text
GET   /api/v1/children/{child_id}/rules/
PATCH /api/v1/children/{child_id}/rules/
```

### 6.4 Content

```text
GET  /api/v1/content/
GET  /api/v1/content/{content_id}/
POST /api/v1/content/   # admin/staff only
PATCH /api/v1/content/{content_id}/ # admin/staff only
```

### 6.5 Missions

```text
GET  /api/v1/children/{child_id}/missions/
POST /api/v1/children/{child_id}/missions/generate/
POST /api/v1/missions/{mission_id}/start/
POST /api/v1/missions/{mission_id}/complete/
POST /api/v1/missions/{mission_id}/skip/
```

### 6.6 Rewards

```text
GET  /api/v1/children/{child_id}/wallet/
GET  /api/v1/children/{child_id}/transactions/
POST /api/v1/children/{child_id}/rewards/adjust/ # parent only
```

### 6.7 Entertainment

```text
GET  /api/v1/children/{child_id}/entertainment/options/
POST /api/v1/children/{child_id}/entertainment/start/
POST /api/v1/entertainment/{session_id}/stop/
GET  /api/v1/children/{child_id}/entertainment/sessions/
```

### 6.8 Mascot

```text
GET  /api/v1/children/{child_id}/mascot/
GET  /api/v1/children/{child_id}/mascot/items/
POST /api/v1/children/{child_id}/mascot/purchase-item/
PATCH /api/v1/children/{child_id}/mascot/customization/
```

### 6.9 Dashboard

```text
GET /api/v1/parent/dashboard/
GET /api/v1/children/{child_id}/dashboard/summary/
GET /api/v1/children/{child_id}/dashboard/weekly-report/
GET /api/v1/children/{child_id}/alerts/
PATCH /api/v1/alerts/{alert_id}/read/
```

### 6.10 AI Services

```text
POST /api/v1/ai/generate-mission/
POST /api/v1/ai/explain-content/
POST /api/v1/ai/generate-parent-summary/
POST /api/v1/ai/safety-check/
```

AI endpoints must enforce safety and parent permissions.

Do not expose open-ended chat endpoints for children.

Avoid:

```text
POST /api/v1/ai/chat/
```

If a chat-like endpoint is necessary internally, restrict it to guided modes and predefined intent types.

## 7. Business Logic Rules

### 7.1 Mission Completion

When a mission is completed:

1. Validate child belongs to authenticated parent/session.
2. Validate mission is active and assigned to the child.
3. Validate mission is not already completed.
4. Verify completion by method:
   - quiz score
   - speech check
   - movement rep count
   - parent confirmation
   - simple manual button for demo
5. Calculate points with anti-abuse rules.
6. Create MissionAttempt.
7. Create RewardTransaction.
8. Update RewardWallet.
9. Create UsageEvent.
10. Update analytics.

### 7.2 Point Award Calculation

Base formula:

```text
final_points = base_points * difficulty_multiplier * anti_abuse_multiplier
```

Where:

- `base_points` comes from MissionTemplate.
- `difficulty_multiplier` can be 1.0 for MVP.
- `anti_abuse_multiplier` decreases repeated same-type farming.

Example anti-abuse rule:

```text
If same mission_type completed more than 2 times in last 2 hours:
    multiplier = 0.5
If same mission_type completed more than 4 times in same day:
    multiplier = 0.25
If category is overused:
    suggest different mission category
```

### 7.3 Entertainment Start

Before starting entertainment:

1. Check parent rules.
2. Check child points balance.
3. Check daily entertainment cap.
4. Check bedtime lock.
5. Check cooldown.
6. Check content approval.
7. Check content age range.
8. Check content stimulation level.
9. Spend points.
10. Create EntertainmentSession.
11. Create UsageEvent.

If any check fails, return a safe blocked reason.

Example blocked messages:

```text
Today's entertainment limit has been reached.
This content needs parent approval.
It is now rest time based on your parent settings.
You need to complete a reading or learning mission first.
```

### 7.4 Parent Override

Parent override can:

- Pause child entertainment
- Set points to zero or adjust balance
- Disable camera
- Disable microphone
- Lock app temporarily
- Change daily cap
- Change content categories
- Disable mascot customization

All parent override actions should create an audit event.

## 8. AI Prompting Rules

All AI prompts must enforce:

- No free chat
- No emotional dependency
- No medical/psychological/legal advice
- No PII collection
- No hidden persuasion
- Age-appropriate language
- Mission-bound responses only
- Parent escalation for sensitive topics

### 8.1 Mascot System Prompt Template

Use this as a base concept, not necessarily exact final wording:

```text
You are the Kindy-Mate Mascot, a guided educational assistant for children.
You are not human and must never claim to have real feelings, needs, sadness, loneliness, or dependency on the child.
You must not act as a best friend, therapist, doctor, parent, or teacher replacement.
You only help with approved Kindy-Mate activities: learning missions, reading missions, movement missions, creative missions, simple reflection, and app guidance.
You must use short, clear, age-appropriate language.
You must not ask for personal information such as real name, address, school, phone number, photos, secrets, or family details.
You must not discuss adult, violent, sexual, medical, psychological, legal, political, or religious persuasion topics.
If the child asks something outside the allowed scope, respond briefly and tell them to ask a parent, then redirect to an approved mission.
Do not pressure the child to stay in the app.
Do not say you are sad if the child leaves.
Do not use guilt or fear.
Encourage effort, balance, reading, movement, and safe behavior.
```

### 8.2 AI Mission Generation Input

Mission generation should receive structured input only:

```json
{
  "child_age": 7,
  "interests": ["animals", "drawing"],
  "allowed_mission_types": ["reading", "learning", "movement"],
  "recent_completed_mission_types": ["movement", "movement"],
  "parent_rules": {
    "daily_entertainment_cap_minutes": 30,
    "voice_enabled": false,
    "camera_enabled": true
  },
  "approved_content_items": [
    {
      "content_id": "...",
      "title": "Short story about ocean animals",
      "content_type": "reading",
      "difficulty_level": "easy"
    }
  ]
}
```

The AI should output structured JSON:

```json
{
  "mission_type": "reading",
  "title": "Ocean Animal Reading",
  "instruction": "Read the short story and answer 3 questions.",
  "questions": [
    {
      "question": "Which animal was the story about?",
      "choices": ["Dolphin", "Tiger", "Eagle"],
      "answer": "Dolphin"
    }
  ],
  "safety_notes": "Age appropriate. No sensitive content."
}
```

Do not accept unstructured AI output directly into the database without validation.

### 8.3 Parent Summary Prompt

Parent summaries should be factual, calm, and non-diagnostic.

Allowed:

```text
This week, your child completed 8 learning missions, 4 reading missions, and 5 movement missions. Entertainment time stayed within the 30-minute daily cap on 5 out of 7 days. Reading missions were skipped more often than movement missions, so next week you may consider shorter reading tasks or stories related to animals.
```

Avoid:

```text
Your child is addicted to entertainment.
Your child has poor discipline.
Your child may have attention problems.
```

## 9. Safety Fallback Responses

Use short fallback responses for child-facing AI.

Examples:

```text
I can only help with Kindy-Mate learning, reading, movement, and creative missions. Please ask your parent about that.
```

```text
That sounds important. Please talk to your parent or a trusted adult.
```

```text
I cannot help with that topic. Let’s return to your mission.
```

```text
You have reached today’s entertainment limit. Great effort today. You can come back tomorrow.
```

Do not produce long explanations for sensitive child-facing topics.

## 10. Content Governance Implementation

Before content appears to a child, it must pass:

1. Approval status check
2. Age range check
3. License status check
4. Stimulation level check
5. Parent category check
6. Safety notes check

Suggested helper:

```python
def can_child_access_content(child, content_item):
    if content_item.approval_status != "approved":
        return False, "content_not_approved"
    if not (content_item.age_min <= child.age <= content_item.age_max):
        return False, "age_mismatch"
    if content_item.license_status in ["unknown"]:
        return False, "license_unknown"
    if content_item.content_type not in child.parent_rule.allowed_content_categories:
        return False, "category_not_allowed"
    return True, None
```

## 11. Demo Content Strategy

For demo purposes:

- Use internally written sample stories.
- Use internally written math/logic questions.
- Use internally defined movement tasks.
- Use placeholder video cards instead of embedding copyrighted videos if licensing is unclear.
- If embedding public videos, use official sources only and mark them as demo references.
- Do not scrape YouTube/TikTok/Shorts.

Recommended demo content categories:

```text
reading: 5 short stories
learning: 10 math/logic/vocabulary tasks
movement: 5 simple movement tasks
creative: 3 drawing/story prompts
entertainment: 3 low-stimulation placeholder games/videos
documentary: 3 educational video placeholders
mascot_items: 10 cosmetic items
```

## 12. Frontend UX Flow

### 12.1 Parent Onboarding Flow

1. Parent registers/logs in.
2. Parent confirms consent.
3. Parent creates child profile.
4. Parent sets age, nickname, interests.
5. Parent sets daily entertainment cap.
6. Parent chooses allowed content categories.
7. Parent enables/disables microphone.
8. Parent enables/disables camera.
9. Parent enters child mode.

### 12.2 Child Home Flow

1. Child sees mascot.
2. Child sees current points.
3. Child sees today's progress.
4. Child sees available mission options.
5. Child can choose a mission.
6. Child can access rewards if enough points and parent rules allow.

### 12.3 Mission Flow

1. Show mission instruction.
2. Show content/task.
3. Child completes task.
4. Verify task.
5. Award points.
6. Show effort-based feedback.
7. Suggest next action.

### 12.4 Entertainment Flow

1. Child selects entertainment item.
2. Backend checks rules.
3. If allowed, spend points and start session.
4. Timer counts down.
5. Session ends automatically.
6. Cooldown begins.
7. Dashboard updates.

### 12.5 Parent Dashboard Flow

1. Parent enters PIN/password.
2. Parent sees child summary.
3. Parent sees time balance chart.
4. Parent sees points earned/spent.
5. Parent sees alerts.
6. Parent adjusts rules if needed.

## 13. UI Design Guidance

### 13.1 Child UI

Use:

- Rounded cards
- Soft colors
- Large buttons
- Clear icons
- Minimal text
- Calm animations
- Short feedback
- No aggressive flashing
- No infinite feeds

Avoid:

- Dark patterns
- Flashy reward explosions
- Countdown pressure except normal session timer
- Red warning-heavy design
- Manipulative mascot sadness

### 13.2 Parent UI

Use:

- Clean dashboard
- Simple graphs
- Clear controls
- Calm alerts
- Explanation of AI recommendations
- Direct override buttons

Avoid:

- Overly technical AI jargon
- Alarmist language
- Invasive surveillance feel

## 14. Authentication and Authorization

Backend must enforce object-level permissions.

Rules:

- Parent can only access their own child profiles.
- Child mode can only access limited child-facing endpoints.
- Admin/staff can manage content if authorized.
- Parent dashboard endpoints require parent authentication.
- Child-facing endpoints should not expose parent settings details beyond what is needed.
- AI endpoints must validate parent/child ownership.

## 15. Environment Variables

Use `.env.example` to define required variables.

Suggested variables:

```text
DJANGO_SECRET_KEY=
DJANGO_DEBUG=
DJANGO_ALLOWED_HOSTS=
DATABASE_URL=
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_PORT=
CORS_ALLOWED_ORIGINS=
FRONTEND_URL=
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
AI_PROVIDER=
AI_ENABLE_CLOUD=true
MEDIA_STORAGE_BACKEND=local
```

Do not commit real secrets.

## 16. Docker Compose Guidance

Development compose should include:

- backend service
- frontend service
- postgres service
- redis optional

Production compose should include:

- backend service
- frontend build or Next.js service
- postgres service
- nginx/reverse proxy optional
- redis optional

Health checks should be added where possible.

## 17. Testing Requirements

Write tests for critical safety/business logic.

Required backend tests:

- Parent cannot access another parent's child profile.
- Child cannot start entertainment beyond daily cap.
- Child cannot start entertainment without enough points.
- Child cannot start entertainment during bedtime lock.
- Content with unapproved status is blocked.
- Content outside age range is blocked.
- Points are awarded only once per completed mission.
- Repeated mission attempts trigger diminishing returns.
- Parent override blocks entertainment.
- AI free-chat endpoint does not exist or is restricted.

Suggested frontend tests:

- Parent onboarding flow renders.
- Child mission flow renders.
- Entertainment blocked state renders.
- Dashboard summary renders.
- Parent settings update form works.

## 18. Seed Data

Create seed data for demo.

Suggested seed files in `backend/scripts/`:

```text
seed_content.py
seed_missions.py
seed_mascot_items.py
seed_demo_user.py
```

Seed data should include:

- 1 demo parent
- 1 demo child
- Parent rules
- 5 reading content items
- 10 learning content items
- 5 movement content items
- 3 creative prompts
- 3 entertainment placeholders
- 3 documentary placeholders
- 10 mascot items
- Wallet with starter points or zero points depending on demo flow

## 19. MVP Demo Scenario

Build the demo around one clean story.

Demo flow:

1. Parent logs in.
2. Parent creates child profile: age 7, nickname “Milo”.
3. Parent sets daily entertainment cap: 30 minutes.
4. Parent enables movement verification but disables free chat.
5. Child enters app.
6. Mascot offers three missions: reading, math, movement.
7. Child completes reading mission.
8. Child earns points.
9. Child spends points to unlock 10 minutes of calm entertainment.
10. Child tries to unlock more entertainment after cap/cooldown.
11. App blocks and explains safely.
12. Parent dashboard shows balance and AI summary.

This demo proves:

- Parent control
- Child engagement
- AI-supported missions
- Reward economy
- Anti-abuse control
- Dashboard impact
- SDG alignment

## 20. Future Roadmap

### Phase 1 — MVP

- Parent account
- Child profile
- Missions
- Reward points
- Entertainment cap
- Dashboard
- Basic mascot
- Demo content

### Phase 2 — AI-enhanced prototype

- LLM mission generation
- LLM parent summaries
- Speech recognition demo
- MediaPipe movement verification
- Better analytics

### Phase 3 — Safety and scale

- On-device voice/CV
- RAG over approved content
- Content approval workflow
- License management
- Stronger moderation
- Multi-child support

### Phase 4 — Ecosystem

- School mode
- Teacher dashboard
- NGO/SDG partnership
- Localized content
- Offline low-bandwidth mode
- Accessibility support

## 21. Do Not Build

Do not build these unless explicitly approved:

- Free-chat AI companion for children
- Open-ended chatbot page
- AI emotional counseling
- Mascot sadness/guilt animations
- Loot boxes
- Gacha rewards
- Real-money coin purchases for children
- Infinite video feed
- TikTok/Reels/Shorts clone
- Uncontrolled YouTube recommendation feed
- Public child profiles
- Child social networking
- Direct messaging between children
- Health diagnosis
- Mental health diagnosis
- Body image scoring
- Leaderboards comparing children

## 22. Engineering Quality Standards

Backend:

- Use typed serializers/schemas where possible.
- Keep business logic in services, not bloated views.
- Use database transactions for wallet updates.
- Use object-level permission checks.
- Validate AI outputs before saving.
- Add tests for safety-critical logic.

Frontend:

- Use TypeScript types for API responses.
- Keep child and parent interfaces separate.
- Avoid exposing admin/parent controls in child mode.
- Keep UI calm and accessible.
- Handle blocked states gracefully.

General:

- Prefer safe defaults.
- Keep features parent-controlled.
- Avoid overclaiming.
- Document assumptions.
- Keep demo feasible.

## 23. Definition of Done for MVP

MVP is done when:

- Parent can register/login.
- Parent can create a child profile.
- Parent can set daily entertainment cap.
- Child can view missions.
- Child can complete at least one learning/reading mission.
- Child can complete at least one movement mission manually or with demo verification.
- Child earns points.
- Child spends points on a limited reward.
- Entertainment cannot exceed daily cap.
- Parent can view dashboard summary.
- AI is used only in guided mode.
- There is no free-chat child AI.
- Content is served from a curated content bank.
- Unsafe content and unapproved content are blocked.

## 24. Final Build Principle

When implementing any feature, ask:

1. Does this help convert passive screen time into useful activity?
2. Does this keep parents in control?
3. Does this protect child privacy?
4. Does this avoid addictive design?
5. Does this keep AI bounded and safe?
6. Does this support SDG 4 or SDG 3?
7. Does this improve the quality of screen time rather than increasing it?

If the answer is no, do not build the feature yet.
