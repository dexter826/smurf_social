# 🐳 Smurf Social

> Ứng dụng mạng xã hội & chat realtime hiện đại được xây dựng với React, TypeScript và Firebase

[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12.8.0-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

---

## 📋 Mục Lục

- [Giới Thiệu](#-giới-thiệu)
- [Tính Năng](#-tính-năng)
- [Tech Stack](#-tech-stack)
- [Kiến Trúc](#-kiến-trúc)
- [Cài Đặt](#-cài-đặt)
- [Cấu Hình](#-cấu-hình)
- [Chạy Dự Án](#-chạy-dự-án)
- [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)
- [Scripts](#-scripts)
- [Deployment](#-deployment)
- [Đóng Góp](#-đóng-góp)
- [License](#-license)

---

## 🎯 Giới Thiệu

**Smurf Social** là một ứng dụng mạng xã hội full-featured với khả năng chat realtime, newsfeed, quản lý bạn bè và nhiều tính năng khác. Dự án được xây dựng với mục tiêu tạo ra một nền tảng kết nối cộng đồng hiện đại, nhanh chóng và dễ sử dụng.

### Tại Sao Chọn Smurf Social?

- ⚡ **Realtime**: Chat và notifications được cập nhật tức thì
- 🎨 **Modern UI**: Giao diện đẹp mắt với dark/light mode
- 📱 **Responsive**: Hoạt động mượt mà trên mọi thiết bị
- 🔒 **Bảo Mật**: Firebase Authentication & Firestore Security Rules
- 🚀 **Performance**: Code splitting, lazy loading, image optimization
- 🧪 **Type-Safe**: TypeScript cho toàn bộ codebase

---

## ✨ Tính Năng

### 🔐 Authentication
- Đăng ký / Đăng nhập với email & password
- Email verification
- Quên mật khẩu
- Session management

### 💬 Chat Realtime
- Chat 1-1 và nhóm
- Gửi text, images, videos, files, voice messages
- Reactions, reply, forward, edit, recall messages
- Typing indicators
- Read receipts & delivery status
- Mention users trong nhóm
- Group management (add/remove members, promote admin...)

### 📰 Newsfeed
- Đăng bài với text, images, videos
- Reactions (like, love, haha, wow, sad, angry)
- Comments & replies
- Visibility settings (public, friends, private)
- Edit & delete posts

### 👥 Contacts & Friends
- Gửi & nhận friend requests
- Quản lý danh sách bạn bè
- Tìm kiếm người dùng
- Block/unblock users

### 🔔 Notifications
- Realtime notifications
- Push notifications (FCM)
- Notification types: likes, comments, friend requests, reports...

### 👤 Profile
- Cập nhật thông tin cá nhân
- Upload avatar & cover image
- Xem posts của user
- Thống kê bạn bè & posts

### ⚙️ Settings
- Theme (light/dark mode)
- Privacy settings
- Account settings

### 🛡️ Admin Dashboard
- Quản lý users (ban/unban)
- Xử lý reports
- Thống kê hệ thống

---

## 🛠️ Tech Stack

### Frontend
- **React 19.2.3** - UI library
- **TypeScript 5.8.2** - Type safety
- **Vite 6.2.0** - Build tool
- **React Router DOM 7.13.0** - Routing
- **Zustand 5.0.10** - State management
- **Tailwind CSS 3.4.17** - Styling
- **Styled Components 6.3.8** - CSS-in-JS
- **React Hook Form 7.71.1** - Form handling
- **Zod 4.3.6** - Schema validation
- **Lucide React** - Icons
- **Emoji Picker React** - Emoji picker
- **React Easy Crop** - Image cropping

### Backend & Services
- **Firebase Authentication** - User authentication
- **Firestore** - NoSQL database
- **Firebase Realtime Database** - Presence system
- **Firebase Storage** - File storage
- **Firebase Cloud Messaging** - Push notifications
- **Cloudinary** - Image/video hosting & optimization

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

---

## 🏗️ Kiến Trúc

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (React SPA)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Pages   │  │Components│  │  Hooks   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │              │                    │
│       └─────────────┴──────────────┘                    │
│                     │                                   │
│              ┌──────▼──────┐                           │
│              │   Stores    │  (Zustand)                │
│              │  (State)    │                           │
│              └──────┬──────┘                           │
│                     │                                   │
│              ┌──────▼──────┐                           │
│              │  Services   │  (Business Logic)         │
│              └──────┬──────┘                           │
└─────────────────────┼───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐         ┌────────▼────────┐
│    Firebase    │         │   Cloudinary    │
│  - Auth        │         │  - Images       │
│  - Firestore   │         │  - Videos       │
│  - RTDB        │         └─────────────────┘
│  - Storage     │
│  - FCM         │
└────────────────┘
```

### Data Flow

```
User Action → Component → Hook → Store → Service → Firebase
                                   ↓
                              Update State
                                   ↓
                            Re-render Component
```

Xem thêm chi tiết tại [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 📦 Cài Đặt

### Yêu Cầu Hệ Thống

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 hoặc **yarn**: >= 1.22.0
- **Git**: Latest version

### Clone Repository

```bash
git clone https://github.com/your-username/smurf-social.git
cd smurf-social
```

### Cài Đặt Dependencies

```bash
npm install
# hoặc
yarn install
```

---

## ⚙️ Cấu Hình

### 1. Firebase Setup

1. Tạo project mới tại [Firebase Console](https://console.firebase.google.com/)
2. Enable các services:
   - Authentication (Email/Password)
   - Firestore Database
   - Realtime Database
   - Storage
   - Cloud Messaging (optional)
3. Lấy Firebase config từ Project Settings

### 2. Cloudinary Setup

1. Tạo account tại [Cloudinary](https://cloudinary.com/)
2. Lấy Cloud Name và Upload Preset từ dashboard

### 3. Environment Variables

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Điền thông tin vào `.env`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Optional
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### 4. Firestore Security Rules

Deploy Firestore rules:

```bash
firebase deploy --only firestore:rules
```

### 5. Firestore Indexes

Deploy Firestore indexes:

```bash
firebase deploy --only firestore:indexes
```

---

## 🚀 Chạy Dự Án

### Development Mode

```bash
npm run dev
# hoặc
yarn dev
```

Mở trình duyệt tại: `http://localhost:3000`

### Build Production

```bash
npm run build
# hoặc
yarn build
```

### Preview Production Build

```bash
npm run preview
# hoặc
yarn preview
```

---

## 📁 Cấu Trúc Thư Mục

```
smurf-social/
├── .agent/              # Agent configs & analysis
├── docs/                # Documentation
├── public/              # Static assets
├── src/
│   ├── components/      # UI components
│   ├── constants/       # App constants
│   ├── firebase/        # Firebase config
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── services/        # Business logic & API calls
│   ├── store/           # Zustand stores
│   ├── styles/          # Global styles
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── types.ts         # TypeScript types
├── .env.example         # Environment variables template
├── firebase.json        # Firebase config
├── firestore.rules      # Firestore security rules
├── package.json         # Dependencies
├── tailwind.config.js   # Tailwind config
├── tsconfig.json        # TypeScript config
└── vite.config.ts       # Vite config
```

Xem chi tiết tại [FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md)

---

## 📜 Scripts

| Script | Mô Tả |
|--------|-------|
| `npm run dev` | Chạy development server |
| `npm run build` | Build production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint code với ESLint |
| `npm run format` | Format code với Prettier |
| `npm run type-check` | Check TypeScript types |

---

## 🌐 Deployment

### Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase:
```bash
firebase init
```

4. Build và deploy:
```bash
npm run build
firebase deploy
```

### Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

### Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Deploy:
```bash
npm run build
netlify deploy --prod
```

Xem chi tiết tại [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

---

## 🤝 Đóng Góp

Chúng tôi rất hoan nghênh mọi đóng góp! Vui lòng đọc [CONTRIBUTING.md](docs/CONTRIBUTING.md) để biết thêm chi tiết.

### Quy Trình Đóng Góp

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

### Coding Conventions

- Sử dụng TypeScript cho tất cả code
- Follow ESLint & Prettier rules
- Viết tests cho features mới
- Viết JSDoc comments cho public APIs
- Follow naming conventions trong [CODING_CONVENTIONS.md](docs/CODING_CONVENTIONS.md)

---

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - Kiến trúc hệ thống
- [Codebase Overview](docs/CODEBASE_OVERVIEW.md) - Tổng quan codebase
- [Folder Structure](docs/FOLDER_STRUCTURE.md) - Cấu trúc thư mục
- [Coding Conventions](docs/CODING_CONVENTIONS.md) - Quy ước code
- [Contributing](docs/CONTRIBUTING.md) - Hướng dẫn đóng góp
- [Environment Setup](docs/ENVIRONMENT_SETUP.md) - Cài đặt môi trường
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Hướng dẫn deploy
- [API Reference](docs/API_REFERENCE.md) - Tài liệu API

---

## 🐛 Bug Reports & Feature Requests

Nếu bạn phát hiện bug hoặc muốn đề xuất tính năng mới, vui lòng tạo issue tại [GitHub Issues](https://github.com/your-username/smurf-social/issues).

---

## 📝 Changelog

Xem [CHANGELOG.md](docs/CHANGELOG.md) để biết lịch sử thay đổi.

---

## 🗺️ Roadmap

### Q1 2026
- [ ] Video calls (WebRTC)
- [ ] Stories feature
- [ ] Advanced search & filters
- [ ] User mentions trong posts

### Q2 2026
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] AI-powered content moderation
- [ ] Multi-language support

### Q3 2026
- [ ] Marketplace feature
- [ ] Events & groups
- [ ] Live streaming
- [ ] Analytics dashboard

---

## 👥 Team

- **Lead Developer**: [Your Name](https://github.com/your-username)
- **UI/UX Designer**: [Designer Name](https://github.com/designer)
- **Backend Developer**: [Backend Dev](https://github.com/backend-dev)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI library
- [Firebase](https://firebase.google.com/) - Backend services
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide](https://lucide.dev/) - Icon library
- [Cloudinary](https://cloudinary.com/) - Media hosting

---

## 📞 Contact

- **Email**: your.email@example.com
- **Website**: https://smurf-social.com
- **Twitter**: [@smurfsocial](https://twitter.com/smurfsocial)
- **Discord**: [Join our community](https://discord.gg/smurfsocial)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/smurf-social&type=Date)](https://star-history.com/#your-username/smurf-social&Date)

---

<div align="center">

**Made with ❤️ by Smurf Social Team**

[Website](https://smurf-social.com) • [Documentation](docs/) • [Report Bug](https://github.com/your-username/smurf-social/issues) • [Request Feature](https://github.com/your-username/smurf-social/issues)

</div>
