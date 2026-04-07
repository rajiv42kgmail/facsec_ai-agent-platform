// Minimal dashboard
import React,{useState,useEffect} from 'react';
import axios from 'axios';
import LoginForm from './LoginForm';

const api = axios.create({ baseURL: 'http://localhost:5000' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export default function App() {
  const [output,setOutput] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  useEffect(() => {
  const userData = localStorage.getItem("userdata");
  if (userData && isLoggedIn) {
    setOutput(userData);
  }
}, [isLoggedIn]);
 

  const resetlogin = async () => {
    localStorage.clear();

    /* localStorage.removeItem('token');
     localStorage.removeItem('userdata');
      localStorage.removeItem('role');*/
     setIsLoggedIn(false);
  };
  

  

  const countTokens = async () => {
    const res = await api.get('/api/tokens');
   
     setOutput(JSON.stringify(res.data, null, 2));
    
  };

   const countTokensAll = async () => {
    const res = await api.get('/api/tokens/all');
     setOutput(JSON.stringify(res.data, null, 2));
    
  };

  



  const createWorkflow = async () => {
     // Create workflow
                const createworkflowres = await api.post("/api/workflow", {
                              name: "My Workflow",
                              steps: [
                                { type: "agent" },
                                { type: "tool" },
                                { type: "webhook", url: "http://localhost:5000/api/webhook" },
                                { type: "human" }
                              ]
                  });
                  console.log("Workflow Created Data res:", createworkflowres.data);
                  console.log("Workflow Created Data res id: " , createworkflowres.data.id);
                  localStorage.setItem("workflowId", createworkflowres.data.id); // save for run
                   setOutput(JSON.stringify(createworkflowres.data, null, 2));
  }


  const runWorkflow = async () => {
                // Run workflow
                    const id = localStorage.getItem("workflowId");

                    if (!id) {
                      return alert("Create workflow first!");
                    }

                    const res = await api.post(`/api/workflow/run/${id}`, {
                      input: "Analyze customer data"
                    });

                    console.log("Run result:", res.data);
                      setOutput(JSON.stringify(res.data, null, 2));
                    if (res.data.status === "pending") {
                      console.log("Waiting for approval...");
                         setOutput("Waiting for approval..."); 
                      // Auto approve (for demo)
                      await api.post("/api/approve", {
                        approvalId: res.data.approvalId
                      });

                      setOutput("Approved!");
                       console.log("Approved!");
                    } else {
                      setOutput("Completed: " +JSON.stringify(res.data, null, 2));
                       console.log("Completed: " , res.data);
                    }
  } 
  return (
     <div>
            {!isLoggedIn ? (
              <LoginForm onLogin={() => setIsLoggedIn(true)} />
            ) : (
              <>
                 <h2>Welcome {localStorage.getItem('role')} !!!</h2>  
                <button onClick={resetlogin}>Logout</button>
                <button onClick={createWorkflow}>Create Workflow</button>
                <button onClick={runWorkflow}>Run Workflow</button>
                <button onClick={countTokens}>Get Tokens Count</button>
                {localStorage.getItem('role') === 'admin' ? <button onClick={countTokensAll}>Get All Tokens Count</button> : <></> }
               
               
                 <pre> {output ?<label>Data result:</label> : <></> }</pre>
                 <pre>{output}</pre>
              </>
            )}
   </div>


   
  );
}

