import { BrowserRouter, useLocation } from "react-router-dom";
import { ApolloProvider } from "@apollo/client/react";
import { client } from "./services/apollo";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import "./components/layout/marketplace.css";
import "./modules/public/public.css";
export default function App() {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <ApplicationContent />
        </AuthProvider>
      </BrowserRouter>
    </ApolloProvider>
  );
}
function ApplicationContent() {
  const admin = useLocation().pathname.startsWith("/admin");
  return (
    <>
      {!admin && <Navbar />}
      <AppRoutes />
      {!admin && <Footer />}
    </>
  );
}
