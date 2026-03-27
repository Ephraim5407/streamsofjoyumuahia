// RegistrationScreen acts as a redirect gate to the WelcomeScreen // (mirrors the native behaviour where RegistrationScreen renders WelcomeScreen)
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
export default function RegistrationScreen() {
  const navigate = useNavigate();
  useEffect(() => {
    toast("Internet connection may be slow. Redirecting…");
    navigate("/welcome", { replace: true });
  }, [navigate]);
  return null;
}
