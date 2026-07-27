import { useState } from "react";
import { APP_PASSWORD } from "./password";

export default function PasswordScreen({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (password === APP_PASSWORD) {
      setMessage("");
      onSuccess?.();
    } else {
      setMessage("Senha incorreta");
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          width: "350px",
        }}
      >
        <h1
  style={{
    textAlign: "center",
    fontFamily: "'Rubik Spray Paint', cursive",
    fontWeight: "400",
    color: "#E60023",
    fontSize: "30px",
    lineHeight: 1,
    letterSpacing: "0px",
    margin: "0 0 14px 0",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  }}
>
  NOZIL
</h1>

<p
  style={{
    textAlign: "center",
    color: "#666",
    marginBottom: "20px",
    fontSize: "15px",
  }}
>
  Digite sua senha para continuar
</p>

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Digite sua senha aqui"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "15px",
            marginBottom: "10px",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={() => setShowPassword(!showPassword)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
            cursor: "pointer",
          }}
        >
          {showPassword ? "Ocultar senha" : "Mostrar senha"}
        </button>

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "12px",
            cursor: "pointer",
          }}
        >
          Entrar
        </button>

        {message && (
          <p
            style={{
              color: "red",
              marginTop: "15px",
              textAlign: "center",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}