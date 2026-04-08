import { useState } from "react";
import axios from "axios";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const handleChange = (e) => {
    setRole(e.target.value);
  };
  const handleRegister = async () => {
    if(role==="") {
       alert("Select Role"); return;
    }
   
    try {
      const res = await axios.post("http://localhost:5000/api/register", {
        email,
        password,
        role
      });
     if(res.data.user)   alert("Signed up successfully!!");

    } catch (err) {
      alert(err.response?.data?.error || "Signed up failed");
     
    }
  };

  return (
    <div>
      <h2>Signup</h2>

      <input
        type="text"
        placeholder="Email / User ID"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <label>
        <input
          type="radio"
          value="admin"
          checked={role === "admin"}
          onChange={handleChange}
        />
        Admin
      </label>

      <label>
        <input
          type="radio"
          value="user"
          checked={role === "user"}
          onChange={handleChange}
        />
        User
      </label>

      <button onClick={handleRegister}>Signup</button>
    </div>
  );
}