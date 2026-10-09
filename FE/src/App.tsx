import PwaStatus from "./features/pwa/PwaStatus";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { NotificationProvider } from "./context/NotificationProvider";
import { router } from "./routes";

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
        <PwaStatus />
      </NotificationProvider>
    </AuthProvider>
  );
}
