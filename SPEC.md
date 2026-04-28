# K-Monitor: Self-Hosted Uptime Monitoring Application

## Project Overview

- **Project Name**: K-Monitor
- **Type**: Full-stack web application (monorepo)
- **Core Functionality**: Self-hosted uptime monitoring similar to Uptime Kuma with HTTP/HTTPS, TCP, and ICMP monitoring capabilities
- **Target Users**: DevOps engineers, system administrators, and developers who need self-hosted monitoring solutions

## Technology Stack

### Backend
- Node.js with Fastify for API routing
- BullMQ with Redis for task queue
- Drizzle ORM with SQLite for database

### Frontend
- Next.js 14 with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations

### Infrastructure
- SQLite (file-based, zero-config)
- Redis (for BullMQ backend)

---

## UI/UX Specification

### Design System: Futuristic Cyberpunk

#### Color Palette
| Role | Color | Hex Code |
|------|-------|----------|
| Background Primary | Deep Black | `#000000` |
| Background Secondary | Near Black | `#050505` |
| Background Tertiary | Dark Gray | `#0A0A0F` |
| Surface/Card | Semi-transparent Black | `rgba(10, 10, 15, 0.7)` |
| Border | Dark Border | `rgba(255, 255, 255, 0.08)` |
| Text Primary | Off White | `#E0E0E0` |
| Text Secondary | Gray | `#808080` |
| Text Muted | Dark Gray | `#505050` |
| Neon Green (Operational) | Bright Neon Green | `#00FF88` |
| Neon Red (Down) | Bright Neon Red | `#FF3366` |
| Neon Yellow (Degraded) | Bright Neon Yellow | `#FFEE00` |
| Neon Cyan (Info) | Neon Cyan | `#00FFFF` |
| Neon Purple (Accent) | Neon Purple | `#BB86FC` |

#### Typography
- **Primary Font**: JetBrains Mono (monospace for technical details)
- **UI Font**: Inter (for UI labels)
- **Font Sizes**:
  - Display: 48px
  - H1: 32px
  - H2: 24px
  - H3: 18px
  - Body: 14px
  - Small: 12px
  - Tiny: 10px

#### Spacing System
- Base unit: 4px
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

#### Visual Effects
- **Glassmorphism**: `background: rgba(10, 10, 15, 0.7); backdrop-filter: blur(12px);`
- **Glow Effects**: `box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);`
- **Border Glow**: `border: 1px solid rgba(0, 255, 136, 0.3);`
- **Animations**: Framer Motion for smooth transitions (0.2s ease-out)

### Layout Structure

#### Dashboard Page (`/`)
```
┌──────────────────────────────────────────────────────────────┐
│ HEADER: Logo | Navigation | Settings Icon                    │
├──────────────────────────────────────────────────────────────┤
│ STATS BAR: Total | Up | Down | Avg Response                  │
├──────────────────────────────────────────────────────────────┤
│ MONITOR GRID                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │ Monitor Card│ │ Monitor Card│ │ Monitor Card│             │
│ │ Status: ●   │ │ Status: ●   │ │ Status: ●   │             │
│ │ URL: xxx    │ │ URL: xxx    │ │ URL: xxx    │             │
│ │ Uptime: 99%│ │ Uptime: 98% │ │ Uptime: 100%│             │
│ └─────────────┘ └─────────────┘ └─────────────┘             │
├──────────────────────────���───────────────────────────────────┤
│ [+ ADD MONITOR BUTTON]                                       │
└──────────────────────────────────────────────────────────────┘
```

#### Add/Edit Monitor Modal
```
┌────────────────────────────────────┐
│ ADD MONITOR                   [X]  │
├────────────────────────────────────┤
│ Name: [_________________________]   │
│ Type: [HTTP ▼] [TCP ▼] [ICMP ▼]    │
│ URL/Host: [______________________]  │
│ Port: [____] (for TCP/ICMP)        │
│ Interval: [60] seconds             │
│ Timeout: [10] seconds              │
│ Check Keywords: [_____________]    │
│ Expected Status: [200]             │
├────────────────────────────────────┤
│ [Cancel]              [Save]       │
└────────────────────────────────────┘
```

#### Public Status Page (`/status`)
```
┌────────────────────────────────────────────────────────────┐
│ ● ALL SYSTEMS OPERATIONAL                                   │
├──────────────────────────────────────────────────────────────┤
│ Service Name          Status    Uptime     Last Check     │
│ ─────────────────────────────────────────────────────────  │
│ api.example.com       ● UP      99.9%       2 min ago      │
│ web.example.com       ● UP      100%        1 min ago       │
└────────────────────────────────────────────────────────────┘
```

#### Heartbeat History (`/monitor/:id`)
```
┌────────────────────────────────────────────────────────────┐
│ MONITOR: api.example.com                         [← Back]  │
├────────────────────────────────────────────────────────────┤
│ CURRENT: ● OPERATIONAL | Latency: 45ms | Uptime: 99.9%      │
├────────────────────────────────────────────────────────────┤
│ 24-HOUR GRID (similar to GitHub contribution graph)        │
│ ░▒▓▓▓▓▒░▒▓▓▓▓▒░▒▓▓▓▓▒░▒▓▓▓▓▒░▒▓▓▓▓▒░▒▓▓▓▓▒░▒▓▓▓▓               │
│ (darker = slower/no response, brighter = faster)          │
├────────────────────────────────────────────────────────────┤
│ HEARTBEAT LOG                                              │
│ Time       Status    Latency   Detail                      │
│ ─────────────────────────────────────────────────────────  │
│ 14:00:00   UP        45ms      200 OK                      ���
�� 13:59:00   UP        42ms      200 OK                      │
│ 13:58:00   DOWN      -         Connection timeout          │
└────────────────────────────────────────────────────────────┘
```

### Components

#### MonitorCard
- Glassmorphic background with blur
- Status indicator dot with neon glow
- URL in monospace font
- Uptime percentage
- Hover: slight scale (1.02) + increased glow

#### StatusIndicator
- UP: Neon green glow (`#00FF88`)
- DOWN: Neon red glow (`#FF3366`)
- DEGRADED: Neon yellow glow (`#FFEE00`)
- PENDING: Pulsing cyan glow (`#00FFFF`)

#### Button
- Primary: Cyan border with glow on hover
- Secondary: Transparent with border
- Danger: Red border/glow

#### Input Fields
- Dark background (`#0A0A0F`)
- Subtle border (`rgba(255, 255, 255, 0.1)`)
- Focus: Cyan border glow

---

## Functionality Specification

### Core Features

#### 1. Monitor Management
- Create, read, update, delete monitors
- Monitor types: HTTP/HTTPS, TCP, ICMP Ping
- Configurable interval (30s - 3600s)
- Configurable timeout (5s - 30s)
- HTTP options: keyword check, status code check

#### 2. Monitoring Engine
- BullMQ worker processes ping jobs
- HTTP: GET request with keyword/status validation
- TCP: Port connectivity check
- ICMP: Ping via system ping command
- Result: UP/DOWN with latency and response time

#### 3. Heartbeat Storage
- Store last 24 hours of heartbeat data
- Prune older data automatically
- Calculate uptime percentage

#### 4. Dashboard
- Real-time status display
- Quick stats: total, up, down, average latency
- Grid view of all monitors

#### 5. Public Status Page
- Read-only view of public monitors
- No authentication required
- Overall status summary

#### 6. Alerting
- Webhook notifications on status change
- Configurable webhook URL per monitor

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/monitors` | List all monitors |
| POST | `/api/monitors` | Create monitor |
| GET | `/api/monitors/:id` | Get monitor details |
| PUT | `/api/monitors/:id` | Update monitor |
| DELETE | `/api/monitors/:id` | Delete monitor |
| GET | `/api/monitors/:id/heartbeats` | Get heartbeat history |
| GET | `/api/status` | Public status page data |
| POST | `/api/webhooks/test` | Test webhook |

### Database Schema

#### monitors
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Monitor name |
| type | TEXT | http/tcp/icmp |
| url | TEXT | URL or host |
| port | INTEGER | Port number |
| interval | INTEGER | Check interval (seconds) |
| timeout | INTEGER | Timeout (seconds) |
| keyword | TEXT | Expected keyword |
| expected_status | INTEGER | Expected status code |
| webhook_url | TEXT | Webhook URL |
| is_public | BOOLEAN | Public status page |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update |

#### heartbeats
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| monitor_id | INTEGER | Foreign key |
| status | TEXT | up/down |
| latency | INTEGER | Response time (ms) |
| message | TEXT | Response detail |
| created_at | DATETIME | Timestamp |

---

## Acceptance Criteria

### Visual Checkpoints
- [ ] Dark cyberpunk background (#000000)
- [ ] Glassmorphic cards with blur effect
- [ ] Neon green status for UP monitors
- [ ] Neon red status for DOWN monitors
- [ ] Monospace font for technical details
- [ ] Smooth Framer Motion transitions

### Functional Checkpoints
- [ ] Can create HTTP monitor
- [ ] Can create TCP monitor
- [ ] Can create ICMP monitor
- [ ] Dashboard shows real-time status
- [ ] Heartbeat history displays 24hr grid
- [ ] Public status page accessible
- [ ] Webhook triggers on status change

### Technical Checkpoints
- [ ] Monorepo structure with api/web separation
- [ ] Fastify API running
- [ ] Next.js frontend running
- [ ] SQLite database operational
- [ ] BullMQ worker processing jobs
- [ ] Redis connected for queue