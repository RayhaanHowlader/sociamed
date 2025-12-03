# Nexus - Social Media Application

A beautiful, modern social media platform built with Next.js, featuring direct messaging, group chats, and a dynamic feed.

## Features

### 🏠 Feed
- Create and share posts with text and images
- Like, comment, and share functionality
- Beautiful card-based layout with smooth animations
- Bookmark posts for later

### 💬 Direct Messages
- One-on-one conversations
- Real-time online status indicators
- Search through conversations
- Voice and video call buttons
- Media sharing support
- Clean, modern chat interface

### 👥 Group Chats
- Create and join group conversations
- View group members with roles (Admin/Member)
- Private and public group options
- Group member management
- Rich messaging with media support
- Emoji reactions

### 👤 Profile
- Customizable profile with cover photo and avatar
- View your posts, media, and likes
- Edit profile information
- Activity statistics (posts, followers, following)
- Beautiful tabbed interface

## Tech Stack

- **Framework**: Next.js 13 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Type Safety**: TypeScript

## Design Features

- Modern gradient accents (blue to cyan)
- Clean, professional aesthetic
- Smooth transitions and hover states
- Responsive layout
- Accessible components
- Beautiful card designs with shadows

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
├── app/
│   ├── page.tsx          # Main application entry
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── nexus/
│   │   ├── sidebar.tsx        # Navigation sidebar
│   │   ├── feed.tsx           # Social feed view
│   │   ├── direct-messages.tsx # 1-on-1 chat
│   │   ├── group-chats.tsx    # Group messaging
│   │   └── profile.tsx        # User profile
│   └── ui/                # shadcn/ui components
```

## Features Overview

### Navigation
- Intuitive sidebar navigation
- Active state indicators
- Quick create post button
- Smooth view transitions

### Messaging
- Beautiful chat bubbles
- Message timestamps
- Online/offline indicators
- Unread message badges
- Search functionality

### Groups
- Visual group icons
- Member lists with roles
- Private/public indicators
- Activity notifications
- Expandable member sidebar

### Posts
- Rich text content
- Image uploads
- Engagement metrics
- Social actions (like, comment, share)
- Elegant card design

## Note

This is a frontend-only implementation with mock data. To add backend functionality, integrate with your preferred backend service (Supabase, Firebase, etc.).
