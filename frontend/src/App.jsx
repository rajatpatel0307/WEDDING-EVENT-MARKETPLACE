import { BrowserRouter } from "react-router-dom";
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
          <Navbar />
          <AppRoutes />
          <Footer />
        </AuthProvider>
      </BrowserRouter>
    </ApolloProvider>
  );
}
