import WalletPage from "../features/payment/pages/WalletPage";
import ReportsPage from "../features/management/pages/ReportsPage";
import AppShell from "../components/layout/AppShell";
import ChatRoomPage from "../features/chat/pages/ChatRoomPage";
import MessagesPage from "../features/chat/pages/MessagesPage";
import OpenMatchConversationPage from "../features/chat/pages/OpenMatchConversationPage";
import DiscoverPage from "../features/discovery/pages/DiscoverPage";
import JobDetailPage from "../features/discovery/pages/JobDetailPage";
import SavedJobsPage from "../features/discovery/pages/SavedJobsPage";
import SkippedJobsPage from "../features/discovery/pages/SkippedJobsPage";
import HomePage from "../features/home/pages/HomePage";
import JobFormPage from "../features/jobs/pages/JobFormPage";
import MyJobsPage from "../features/jobs/pages/MyJobsPage";
import CandidateProfilePage from "../features/matching/pages/CandidateProfilePage";
import CandidateQueuePage from "../features/matching/pages/CandidateQueuePage";
import CandidatesOverviewPage from "../features/matching/pages/CandidatesOverviewPage";
import ProfilePage from "../features/profile/pages/ProfilePage";
import ConnectionPaymentPage from "../features/payment/pages/ConnectionPaymentPage";
import MatchRatingPage from "../features/rating/pages/MatchRatingPage";
import NotificationsPage from "../features/notifications/pages/NotificationsPage";
import FaceComparisonPage from "../features/identity/pages/FaceComparisonPage";

export const privateRoutes = [
  {
    element: <AppShell />,
    children: [
      { path: "wallet", element: <WalletPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "home", element: <HomePage /> },
      { path: "discover", element: <DiscoverPage /> },
      { path: "profile", element: <ProfilePage /> },
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