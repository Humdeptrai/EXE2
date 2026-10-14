import { ChatProvider } from "./context/ChatProvider";
import PwaStatus from "./features/pwa/PwaStatus";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { NotificationProvider } from "./context/NotificationProvider";
import { router } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider><ChatProvider>
        <RouterProvider router={router} />
        <PwaStatus />
      </ChatProvider></NotificationProvider>
    </AuthProvider>
  );
}
