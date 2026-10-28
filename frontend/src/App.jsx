import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { ApolloProvider } from "@apollo/client/react";
import { client } from "./services/apollo";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import "./components/layout/marketplace.css";
import "./modules/public/public.css";
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <AuthProvider>
        <ApplicationContent />
      </AuthProvider>
    ),
  },
]);
export default function App() {
  return (
    <ApolloProvider client={client}>
      <RouterProvider router={router} />
    </ApolloProvider>
  );
}
function ApplicationContent() {
  const pathname = useLocation().pathname;
  const admin =
    pathname.startsWith("/admin") ||
    pathname === "/customer" ||
    pathname.startsWith("/customer/") ||
    ((pathname === "/vendor" || pathname.startsWith("/vendor/")) &&
      !["profile", "pending", "rejected", "suspended", "inactive"].includes(
        pathname.split("/")[2],
      ));
  return (
    <>
      {!admin && <Navbar />}
      <AppRoutes />
      {!admin && <Footer />}
    </>
  );
}
