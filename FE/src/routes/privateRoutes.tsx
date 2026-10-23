import { lazy } from "react";
const MatchDetailPage = lazy(() => import("../features/matching/pages/MatchDetailPage"));
const IdentityAppealPage = lazy(() => import("../features/identity/pages/IdentityAppealPage"));
const IdentityOnboardingPage = lazy(() => import("../features/identity/pages/IdentityOnboardingPage"));
const WalletPage = lazy(() => import("../features/payment/pages/WalletPage"));
const ReportDetailPage = lazy(() => import("../features/management/pages/ReportDetailPage"));
const ReportsPage = lazy(() => import("../features/management/pages/ReportsPage"));
import AppShell from "../components/layout/AppShell";
const ChatRoomPage = lazy(() => import("../features/chat/pages/ChatRoomPage"));
const MessagesPage = lazy(() => import("../features/chat/pages/MessagesPage"));
const OpenMatchConversationPage = lazy(() => import("../features/chat/pages/OpenMatchConversationPage"));
const DiscoverPage = lazy(() => import("../features/discovery/pages/DiscoverPage"));
const JobDetailPage = lazy(() => import("../features/discovery/pages/JobDetailPage"));
const SavedJobsPage = lazy(() => import("../features/discovery/pages/SavedJobsPage"));
const SkippedJobsPage = lazy(() => import("../features/discovery/pages/SkippedJobsPage"));
const HomePage = lazy(() => import("../features/home/pages/HomePage"));
const JobFormPage = lazy(() => import("../features/jobs/pages/JobFormPage"));
const MyJobsPage = lazy(() => import("../features/jobs/pages/MyJobsPage"));
const CandidateProfilePage = lazy(() => import("../features/matching/pages/CandidateProfilePage"));
const CandidateQueuePage = lazy(() => import("../features/matching/pages/CandidateQueuePage"));
const CandidatesOverviewPage = lazy(() => import("../features/matching/pages/CandidatesOverviewPage"));
const ProfilePage = lazy(() => import("../features/profile/pages/ProfilePage"));
const ConnectionPaymentPage = lazy(() => import("../features/payment/pages/ConnectionPaymentPage"));
const MatchRatingPage = lazy(() => import("../features/rating/pages/MatchRatingPage"));
const NotificationsPage = lazy(() => import("../features/notifications/pages/NotificationsPage"));
const FaceComparisonPage = lazy(() => import("../features/identity/pages/FaceComparisonPage"));

export const privateRoutes = [
  {
    element: <AppShell />,
    children: [
      { path: "onboarding", element: <IdentityOnboardingPage /> },
      { path: "wallet", element: <WalletPage /> },
      { path: "reports", element: <ReportsPage /> },
    { path: "reports/:reportId", element: <ReportDetailPage /> },
      { path: "home", element: <HomePage /> },
      { path: "discover", element: <DiscoverPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "identity/requests/:requestId", element: <IdentityAppealPage /> },
      { path: "face-comparison", element: <FaceComparisonPage /> },
      { path: "posts", element: <MyJobsPage /> },
      { path: "candidates", element: <CandidatesOverviewPage /> },
      { path: "posts/:jobId/candidates", element: <CandidateQueuePage /> },
      {
        path: "posts/:jobId/candidates/:interestId",
        element: <CandidateProfilePage />,
      },
      { path: "jobs/new", element: <JobFormPage /> },
      { path: "jobs/:jobId/edit", element: <JobFormPage /> },
      { path: "jobs/:jobId", element: <JobDetailPage /> },
      { path: "saved", element: <SavedJobsPage /> },
      { path: "skipped", element: <SkippedJobsPage /> },
      {
        path: "matches/:matchId/payment",
        element: <ConnectionPaymentPage />,
      },
      { path: "matches/:matchId", element: <MatchDetailPage /> },
      { path: "matches/:matchId/rating", element: <MatchRatingPage /> },
      { path: "messages", element: <MessagesPage /> },
      {
        path: "messages/match/:matchId",
        element: <OpenMatchConversationPage />,
      },
      { path: "messages/:conversationId", element: <ChatRoomPage /> },
      { path: "notifications", element: <NotificationsPage /> },
    ],
  },
];