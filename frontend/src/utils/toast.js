import { toast } from "react-hot-toast";

const showToast = (message, type = "success") => {
  toast(message, {
    duration: 4000,
    position: "top-center",
    icon: type === "success" ? "✅" : "❌",
    style: {
      background: type === "success" ? "#4caf50" : "#f44336",
      color: "#fff",
      padding: "10px",
      borderRadius: "8px",
      fontSize: "16px",
    },
    iconTheme: {
      primary: "#fff",
      secondary: type === "success" ? "#4caf50" : "#f44336",
    },
    ariaProps: {
      role: "status",
      "aria-live": "polite",
    },
  });
};

export default showToast;
