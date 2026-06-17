import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2, FileUp, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/match";

function App() {
  const [jdMode, setJdMode] = useState('text');
  const [jobDescription, setJobDescription] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [resumeFiles, setResumeFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleResumeChange = (e) => setResumeFiles(Array.from(e.target.files));
  const handleJdFileChange = (e) => setJdFile(e.target.files[0]);

  const handleScreening = async () => {
    // Replaced standard errors with premium Toast notifications
    if (jdMode === 'text' && !jobDescription.trim()) return toast.error("Please paste a Job Description.");
    if (jdMode === 'file' && !jdFile) return toast.error("Please upload a Job Description PDF.");
    if (resumeFiles.length === 0) return toast.error("Please upload at least one Candidate Resume PDF.");

    setLoading(true);
    setResults([]);

    const formData = new FormData();
    if (jdMode === 'text') formData.append("job_description", jobDescription);
    if (jdMode === 'file') formData.append("jd_file", jdFile);
    resumeFiles.forEach((file) => formData.append("resumes", file));

    try {
      const response = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResults(response.data);
      toast.success("Analysis Complete!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to connect to the API.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (results.length === 0) return;
    const headers = ["Candidate ID", "Score", "Matched Skills", "Missing Skills", "Explanation"];
    const csvRows = [headers.join(",")];
    results.forEach(res => {
      const row = [
        `"${res.resume_id}"`, `"${res.score}"`, `"${res.matched_skills.join(", ")}"`,
        `"${res.missing_skills.join(", ")}"`, `"${res.explanation.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Resume_Screening_Results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="relative min-h-screen text-slate-800 overflow-hidden font-sans">
      
      {/* Premium Setup: Toast Notifications & Background Gradient */}
      <Toaster position="top-right" reverseOrder={false} />
      
      {/* Subtle Animated Background Blob */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-200/50 to-indigo-300/40 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div className="fixed inset-0 bg-slate-50/50 -z-20 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-10 p-8 relative z-10">
        
        {/* Header (Animated) */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center space-y-3 mt-4"
        >
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
            AI Resume Screener
          </h1>
          <p className="text-lg text-slate-500 font-medium">Powered by Llama 3.3 (Groq) & FastAPI</p>
        </motion.div>

        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-8"
        >
          {/* Job Description Card */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <FileText className="w-5 h-5 text-blue-500" /> Job Description
              </h2>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button onClick={() => setJdMode('text')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${jdMode === 'text' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Text</button>
                <button onClick={() => setJdMode('file')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${jdMode === 'file' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>PDF</button>
              </div>
            </div>

            {jdMode === 'text' ? (
              <textarea className="flex-1 w-full p-4 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none min-h-[200px] transition-all" placeholder="Paste the target job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-blue-50/50 hover:border-blue-300 transition-colors min-h-[200px]">
                <input type="file" accept=".pdf" onChange={handleJdFileChange} className="hidden" id="jd-upload" />
                <label htmlFor="jd-upload" className="cursor-pointer space-y-3 flex flex-col items-center w-full h-full justify-center">
                  <FileUp className="w-10 h-10 text-blue-400" />
                  <span className="text-blue-600 font-semibold hover:underline">Upload JD PDF</span>
                  <span className="text-sm text-slate-500 truncate max-wxs">{jdFile ? jdFile.name : "Select a file"}</span>
                </label>
              </div>
            )}
          </div>

          {/* Candidate Resumes Card */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col transition-all hover:shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
              <UploadCloud className="w-5 h-5 text-blue-500" /> Candidate Resumes
            </h2>
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-blue-50/50 hover:border-blue-300 transition-colors min-h-[200px]">
              <input type="file" multiple accept=".pdf" onChange={handleResumeChange} className="hidden" id="resume-upload" />
              <label htmlFor="resume-upload" className="cursor-pointer space-y-3 flex flex-col items-center w-full h-full justify-center">
                <UploadCloud className="w-10 h-10 text-blue-400" />
                <span className="text-blue-600 font-semibold hover:underline">Browse Resume PDFs</span>
                <span className="text-sm text-slate-500">Select multiple candidates</span>
              </label>
            </div>
            {resumeFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold text-center border border-blue-100">
                {resumeFiles.length} Candidate(s) Ready
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <button onClick={handleScreening} disabled={loading} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-3 text-lg">
            {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> Analyzing...</> : "🚀 Start AI Screening"}
          </button>
        </motion.div>

        {/* Skeleton Loading State */}
        {loading && (
          <div className="space-y-6 mt-12">
            <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">Analyzing Candidates...</h2>
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/60 p-6 rounded-2xl shadow-sm border border-slate-200 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="h-6 bg-slate-200 rounded-md w-1/4"></div>
                  <div className="h-8 bg-slate-200 rounded-full w-20"></div>
                </div>
                <div className="h-3 bg-slate-100 rounded-full w-full mb-6"></div>
                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-4/5 mb-6"></div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="h-24 bg-slate-100 rounded-xl"></div>
                  <div className="h-24 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Section with Framer Motion */}
        {!loading && results.length > 0 && (
          <div className="space-y-6 mt-12">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-2xl font-bold text-slate-800">Analysis Results</h2>
              <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
            
            <div className="grid gap-6">
              {results.map((res, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{res.resume_id}</h3>
                    <span className={`px-4 py-1 rounded-full font-bold text-lg border ${getScoreColor(res.score)}`}>{res.score}/100</span>
                  </div>
                  
                  <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${res.score}%` }} transition={{ duration: 1, delay: 0.2 + (idx * 0.1) }}
                      className={`h-full rounded-full ${res.score >= 75 ? 'bg-green-500' : res.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    />
                  </div>
                  
                  <p className="text-slate-700 mb-6 font-medium italic border-l-4 border-blue-400 pl-4 bg-blue-50/50 py-2 rounded-r-lg">"{res.explanation}"</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-green-50/70 p-5 rounded-xl border border-green-100">
                      <h4 className="font-bold text-green-800 flex items-center gap-2 mb-3"><CheckCircle className="w-5 h-5" /> Matched Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {res.matched_skills.map((skill, i) => <span key={i} className="px-3 py-1.5 bg-white text-green-700 font-semibold border border-green-200 rounded-md shadow-sm text-xs">{skill}</span>)}
                      </div>
                    </div>
                    <div className="bg-red-50/70 p-5 rounded-xl border border-red-100">
                      <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3"><XCircle className="w-5 h-5" /> Missing Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {res.missing_skills.map((skill, i) => <span key={i} className="px-3 py-1.5 bg-white text-red-700 font-semibold border border-red-200 rounded-md shadow-sm text-xs">{skill}</span>)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center mt-12 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500 font-medium">
            Built by{' '}
            <a href="https://www.linkedin.com/in/abhishek291203/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:text-blue-800 hover:underline transition-colors decoration-2 underline-offset-4">
              Abhishek Chourasia
            </a>
          </p>
        </motion.div>
        
      </div>
    </div>
  );
}

export default App;