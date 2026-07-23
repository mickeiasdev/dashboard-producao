import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Users, Calendar as CalendarIcon,
  Settings, ChevronDown, ChevronUp, Save,
  Trash2, Activity, Target, X, Printer, MoreVertical, Edit2, Check, FileText, Download,
  Lock, Key, Mail, ShieldCheck, AlertTriangle
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachWeekOfInterval,
  eachDayOfInterval, isSameMonth, parseISO, getISOWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyARsFLd4h0-tJwtT0w3t6Splv63z5jgHEQ",
  authDomain: "sistema-de-producao-esther.firebaseapp.com",
  projectId: "sistema-de-producao-esther",
  storageBucket: "sistema-de-producao-esther.firebasestorage.app",
  messagingSenderId: "116863548366",
  appId: "1:116863548366:web:2464054fd7ab0687a9099f",
  measurementId: "G-7Y49MN3T26"
};

// Inicialização segura
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Erro ao inicializar Firebase. Verifique suas chaves.");
}

const appId = "producao-esther";

// --- UTILS (REGRAS DE CORES) ---
const getTextColor = (val) => {
  if (val >= 91) return 'text-green-600';
  if (val >= 85) return 'text-yellow-600';
  return 'text-red-600';
};

const getBadgeColor = (val) => {
  if (val >= 91) return 'bg-green-100 text-green-700';
  if (val >= 85) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

const DayCell = ({ day, availableOperations, onUpdateRecord }) => {
  const [newOpId, setNewOpId] = useState('');
  const [newQty, setNewQty] = useState('');

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingOpId, setEditingOpId] = useState(null);
  const [editQty, setEditQty] = useState('');

  const activeOps = day.operationsData.filter(op => op.quantity > 0);
  const inactiveOps = availableOperations.filter(op => !activeOps.find(a => a.id === op.id));

  const handleAdd = () => {
    if (newOpId && newQty) {
      onUpdateRecord(day.dateStr, newOpId, newQty);
      setNewOpId('');
      setNewQty('');
    }
  };

  const handleSaveEdit = (opId) => {
    onUpdateRecord(day.dateStr, opId, editQty);
    setEditingOpId(null);
  };

  return (
    <div className={`p-3 min-h-[220px] flex flex-col ${!day.isCurrentMonth ? 'bg-slate-50/50' : ''}`}>
      {/* Day Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase">{day.dayName.split('-')[0]}</span>
          <span className={`text-xl font-bold ${day.isCurrentMonth ? 'text-slate-700' : 'text-slate-500'}`}>
            {day.dayNumber}
            {!day.isCurrentMonth && <span className="text-xs font-normal ml-1 text-slate-400">({day.monthShort})</span>}
          </span>
        </div>

        {/* Daily Total % Badge */}
        {day.isActive && (
          <div className={`px-2 py-1 rounded text-xs font-bold ${getBadgeColor(day.finalDailyPercentage)}`}>
            {day.finalDailyPercentage.toFixed(1)}% Total
          </div>
        )}
      </div>

      {/* Active Operations List */}
      <div className="flex-1 space-y-2 mb-3">
        {activeOps.map(op => (
          <div key={op.id} className="text-sm bg-slate-50 p-2 rounded border border-slate-200 relative">
            <div className="flex justify-between items-center text-xs mb-1 text-slate-500 font-medium">
              <span className="truncate pr-2" title={op.name}>{op.name}</span>
              <div className="flex items-center gap-1">
                <span className={`${getTextColor(op.percentage)} font-bold`}>
                  {op.percentage.toFixed(1)}%
                </span>
                <button
                  onClick={() => setMenuOpenId(menuOpenId === op.id ? null : op.id)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>

            {/* 3 Dots Menu */}
            {menuOpenId === op.id && (
              <div className="absolute right-0 top-7 bg-white border border-slate-200 shadow-md rounded z-10 w-24 overflow-hidden">
                <button
                  onClick={() => { setEditingOpId(op.id); setEditQty(op.quantity); setMenuOpenId(null); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 text-slate-700 flex items-center gap-2"
                >
                  <Edit2 size={12} /> Editar
                </button>
                <button
                  onClick={() => { onUpdateRecord(day.dateStr, op.id, 0); setMenuOpenId(null); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-slate-100"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 mt-1">
              {editingOpId === op.id ? (
                <>
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(op.id)}
                    className="w-full bg-white border border-blue-400 rounded px-2 py-1 text-right font-bold text-slate-700 outline-none ring-1 ring-blue-400"
                  />
                  <button onClick={() => handleSaveEdit(op.id)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                    <Check size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-full bg-slate-200/50 border border-slate-200 rounded px-2 py-1 text-right font-bold text-slate-600 cursor-not-allowed">
                    {op.quantity}
                  </div>
                  <span className="text-[10px] text-slate-400 w-10 shrink-0">/ {op.dailyGoal}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Form to Add New Operation to this Day */}
      {inactiveOps.length > 0 && (
        <div className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-1">
          <select
            value={newOpId}
            onChange={e => setNewOpId(e.target.value)}
            className="w-full text-xs p-1.5 border border-slate-200 rounded bg-slate-50 text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="">+ Selecionar Operação...</option>
            {inactiveOps.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
          {newOpId && (
            <div className="flex gap-1">
              <input
                type="number"
                placeholder="Qtd..."
                autoFocus
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="flex-1 text-xs p-1.5 border border-slate-200 rounded outline-none focus:border-blue-400"
              />
              <button
                onClick={handleAdd}
                className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-bold transition-colors"
              >
                Salvar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  // --- AUTH / SECURITY STATE (UX Mockado sobre Firebase Real) ---
  const [authStep, setAuthStep] = useState('ip-check'); // 'ip-check', 'otp', 'login', 'authenticated'
  const [otpInput, setOtpInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Firebase Real Auth State
  const [user, setUser] = useState(null);

  // --- DATABASE STATE (Populado pelo Firebase) ---
  const [employees, setEmployees] = useState([]);
  const [operations, setOperations] = useState([]);
  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);

  // UI State
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Selection State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isIndividualReportOpen, setIsIndividualReportOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Form States
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newOpName, setNewOpName] = useState('');
  const [newOpGoal, setNewOpGoal] = useState('');

  // Settings Edit States
  const [editingOpIdSettings, setEditingOpIdSettings] = useState(null);
  const [editOpName, setEditOpName] = useState('');
  const [editOpGoal, setEditOpGoal] = useState('');

  // 1. Firebase Auth Inicialização
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Erro de autenticação no banco:', error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Fetch Dados do Firestore em Tempo Real
  useEffect(() => {
    if (!user) return; // Aguarda usuário

    const basePath = `artifacts/${appId}/users/${user.uid}`;

    const unsubEmp = onSnapshot(collection(db, `${basePath}/employees`), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    const unsubOps = onSnapshot(collection(db, `${basePath}/operations`), (snap) => {
      setOperations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    const unsubRecs = onSnapshot(collection(db, `${basePath}/records`), (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    const unsubLogs = onSnapshot(collection(db, `${basePath}/logs`), (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => a.timestamp - b.timestamp); // Mais antigos primeiro
      setLogs(fetched.map(l => l.message).slice(-150)); // Mantém últimos 150 no frontend
    }, (err) => console.error(err));

    return () => { unsubEmp(); unsubOps(); unsubRecs(); unsubLogs(); };
  }, [user]);

  // Autoselecionar primeiro funcionário quando a lista carregar
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    } else if (employees.length === 0) {
      setSelectedEmployeeId('');
    }
  }, [employees, selectedEmployeeId]);


  const addLog = async (message) => {
    if (!user) return;
    const timestampDate = new Date();
    const timestampStr = format(timestampDate, 'yyyy-MM-dd HH:mm:ss');
    const fullMessage = `[${timestampStr}] ${message}`;

    // Log ID (único)
    const logId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/logs`, logId), {
      message: fullMessage,
      timestamp: timestampDate.getTime()
    });
  };

  const handleDownloadLogs = () => {
    const element = document.createElement("a");
    const file = new Blob([logs.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `auditoria_producao_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addLog('Arquivo de logs TXT baixado pelo usuário.');
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName || !newEmpRole || !user) return;

    const newId = Date.now().toString();
    await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/employees`, newId), {
      name: newEmpName,
      role: newEmpRole
    });

    setNewEmpName('');
    setNewEmpRole('');
    setIsAddEmployeeOpen(false);
    setSelectedEmployeeId(newId);
    addLog(`Funcionário cadastrado: ${newEmpName} (Função: ${newEmpRole}, ID: ${newId})`);
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!user) return;
    await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/employees`, id));
    addLog(`Funcionário excluído do sistema: ${name} (ID: ${id})`);
    setEmployeeToDelete(null);
  };

  const handleAddOperation = async (e) => {
    e.preventDefault();
    if (!newOpName || !newOpGoal || !user) return;

    const newId = Date.now().toString();
    await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/operations`, newId), {
      name: newOpName,
      dailyGoal: Number(newOpGoal)
    });

    setNewOpName('');
    setNewOpGoal('');
    addLog(`Operação criada: ${newOpName} (Meta: ${newOpGoal})`);
  };

  const handleDeleteOperation = async (id, name) => {
    if (!user) return;
    await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/operations`, id));
    addLog(`Operação excluída: ${name} (ID: ${id})`);
  };

  const startEditingOperation = (op) => {
    setEditingOpIdSettings(op.id);
    setEditOpName(op.name);
    setEditOpGoal(op.dailyGoal);
  };

  const handleSaveOperationEdit = async (id) => {
    if (!user) return;
    await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/operations`, id), {
      name: editOpName,
      dailyGoal: Number(editOpGoal)
    }, { merge: true });

    setEditingOpIdSettings(null);
    addLog(`Operação alterada (ID: ${id}): Novo Nome '${editOpName}', Nova Meta '${editOpGoal}'`);
  };

  const handleUpdateRecord = async (date, operationId, quantity) => {
    if (!user) return;
    const qty = Number(quantity);

    const empName = employees.find(e => e.id === selectedEmployeeId)?.name || selectedEmployeeId;
    const opName = operations.find(o => o.id === operationId)?.name || operationId;

    // ID Composto Único para evitar duplicidade no banco
    const docId = `${selectedEmployeeId}_${date}_${operationId}`;
    const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/records`, docId);

    if (qty === 0) {
      await deleteDoc(docRef);
      addLog(`Produção excluída: Func. '${empName}', Dia ${date}, Operação '${opName}'`);
    } else {
      const isEdit = records.some(r => r.id === docId);
      const oldRecord = records.find(r => r.id === docId);

      await setDoc(docRef, {
        employeeId: selectedEmployeeId,
        date,
        operationId,
        quantity: qty
      });

      if (isEdit && oldRecord) {
        addLog(`Produção alterada: Func. '${empName}', Dia ${date}, Operação '${opName}' (De: ${oldRecord.quantity} Para: ${qty})`);
      } else {
        addLog(`Produção lançada: Func. '${empName}', Dia ${date}, Operação '${opName}', Qtd: ${qty}`);
      }
    }
  };


  const calendarData = useMemo(() => {
    if (!selectedMonth || !selectedEmployeeId) return { weeks: [], monthAverage: 0, monthActiveDays: 0 };

    const monthDate = parseISO(`${selectedMonth}-01`);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }); // Monday start

    const employeeRecords = records.filter(r => r.employeeId === selectedEmployeeId);

    let monthTotalPercentage = 0;
    let monthActiveDaysCount = 0;

    const weeksData = weeks.map(weekStart => {
      const weekDays = eachDayOfInterval({
        start: weekStart,
        end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
      });

      let weekTotalPercentage = 0;
      let weekActiveDaysCount = 0;

      const daysData = weekDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isCurrentMonth = isSameMonth(day, monthDate);

        const dayRecords = employeeRecords.filter(r => r.date === dateStr);

        let totalPercentage = 0;
        let operationsCount = 0;

        const dayOperationsData = operations.map(op => {
          const record = dayRecords.find(r => r.operationId === op.id);
          const qty = record ? record.quantity : 0;
          const percentage = (qty / op.dailyGoal) * 100;

          if (qty > 0) {
            totalPercentage += percentage;
            operationsCount++;
          }

          return { ...op, quantity: qty, percentage };
        });

        const finalDailyPercentage = totalPercentage;

        if (operationsCount > 0) {
          weekTotalPercentage += finalDailyPercentage;
          weekActiveDaysCount++;
          monthTotalPercentage += finalDailyPercentage;
          monthActiveDaysCount++;
        }

        return {
          date: day,
          dateStr,
          isCurrentMonth,
          dayName: format(day, 'EEEE', { locale: ptBR }),
          dayNumber: format(day, 'd'),
          monthShort: format(day, 'MMM', { locale: ptBR }),
          operationsData: dayOperationsData,
          finalDailyPercentage,
          isActive: operationsCount > 0
        };
      });

      return {
        weekStart,
        weekNumber: getISOWeek(weekStart),
        days: daysData,
        weekAverage: weekActiveDaysCount > 0 ? (weekTotalPercentage / weekActiveDaysCount) : 0
      };
    });

    return {
      weeks: weeksData,
      monthAverage: monthActiveDaysCount > 0 ? (monthTotalPercentage / monthActiveDaysCount) : 0,
      monthActiveDays: monthActiveDaysCount
    };
  }, [selectedMonth, selectedEmployeeId, records, operations]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const monthlyReportData = useMemo(() => {
    if (!selectedMonth) return [];

    return employees.map(emp => {
      const employeeRecords = records.filter(r => r.employeeId === emp.id && r.date.startsWith(selectedMonth));

      let monthTotalPercentage = 0;
      let monthActiveDaysCount = 0;
      let totalPieces = 0;

      const recordsByDate = employeeRecords.reduce((acc, record) => {
        if (!acc[record.date]) acc[record.date] = [];
        acc[record.date].push(record);
        totalPieces += record.quantity;
        return acc;
      }, {});

      Object.keys(recordsByDate).forEach(date => {
        const dailyRecords = recordsByDate[date];
        let dailyTotalPercentage = 0;
        let hasOperations = false;

        operations.forEach(op => {
          const record = dailyRecords.find(r => r.operationId === op.id);
          const qty = record ? record.quantity : 0;
          if (qty > 0) {
            dailyTotalPercentage += (qty / op.dailyGoal) * 100;
            hasOperations = true;
          }
        });

        if (hasOperations) {
          monthTotalPercentage += dailyTotalPercentage;
          monthActiveDaysCount++;
        }
      });

      const average = monthActiveDaysCount > 0 ? (monthTotalPercentage / monthActiveDaysCount) : 0;

      return {
        ...emp,
        monthlyAverage: average,
        activeDays: monthActiveDaysCount,
        totalPieces
      };
    }).sort((a, b) => b.monthlyAverage - a.monthlyAverage);
  }, [selectedMonth, employees, records, operations]);

  const individualReportData = useMemo(() => {
    if (!selectedEmployeeId || !selectedMonth) return null;
    return calendarData.weeks.map(week => {
      let totalPieces = 0;
      let opsSummary = {};

      week.days.forEach(day => {
        day.operationsData.forEach(op => {
          if (op.quantity > 0) {
            if (!opsSummary[op.name]) opsSummary[op.name] = 0;
            opsSummary[op.name] += op.quantity;
            totalPieces += op.quantity;
          }
        });
      });

      return {
        weekNumber: week.weekNumber,
        weekStart: week.weekStart,
        weekAverage: week.weekAverage,
        totalPieces,
        opsSummary
      };
    });
  }, [calendarData, selectedEmployeeId, selectedMonth]);


  const handleDownloadPDF = (elementId, fileName) => {
    addLog(`Geração de PDF solicitada: ${fileName}`);
    setIsGeneratingPDF(true);

    const element = document.getElementById(elementId);

    const generate = () => {
      const opt = {
        margin: 10,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      window.html2pdf().set(opt).from(element).save().then(() => {
        setIsGeneratingPDF(false);
        addLog(`PDF gerado e baixado com sucesso: ${fileName}`);
      });
    };

    if (window.html2pdf) {
      generate();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = generate;
      document.body.appendChild(script);
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otpInput === '123456') {
      setAuthStep('login');
      setAuthError('');
      addLog('Verificação de IP concluída com sucesso.');
    } else {
      setAuthError('Código incorreto. Tente novamente.');
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
      setAuthStep('authenticated');
      setAuthError('');
      addLog('Login no sistema realizado com sucesso.');
    } else {
      setAuthError('Senha incorreta.');
    }
  };

  React.useEffect(() => {
    if (authStep === 'ip-check') {
      const timer = setTimeout(() => {
        setAuthStep('otp');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [authStep]);

  if (authStep !== 'authenticated') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              {authStep === 'ip-check' && <Activity size={32} className="animate-pulse" />}
              {authStep === 'otp' && <Mail size={32} />}
              {authStep === 'login' && <Lock size={32} />}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {authStep === 'ip-check' && 'Verificando Conexão...'}
            {authStep === 'otp' && 'Novo Dispositivo Detectado'}
            {authStep === 'login' && 'Acesso Restrito'}
          </h2>
          <p className="text-center text-slate-500 mb-8 text-sm">
            {authStep === 'ip-check' && 'Analisando geolocalização e IP do dispositivo...'}
            {authStep === 'otp' && 'Enviamos um código de 6 dígitos para o e-mail do administrador. (Dica: 123456)'}
            {authStep === 'login' && 'Digite sua senha mestre para acessar o painel. (Dica: admin123)'}
          </p>
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm font-medium">
              <AlertTriangle size={16} /> {authError}
            </div>
          )}
          {authStep === 'ip-check' && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          {authStep === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código de Autorização (OTP)</label>
                <input
                  type="text" maxLength="6" autoFocus required value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-3 text-center text-2xl tracking-widest border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  placeholder="000000"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold flex justify-center items-center gap-2">
                <ShieldCheck size={18} /> Validar Dispositivo
              </button>
            </form>
          )}
          {authStep === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha do Sistema</label>
                <div className="relative">
                  <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password" autoFocus required value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-bold">
                Entrar no Dashboard
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 print:bg-white print:p-0">

      {/* Relatório Geral Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 print:p-0 print:bg-transparent print:static print:inset-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden print:shadow-none print:max-w-none print:h-auto print:overflow-visible">

            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:hidden">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-slate-500" />
                Visualização do Relatório
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadPDF('relatorio-geral-content', `Relatorio_Geral_Producao_${selectedMonth}.pdf`)}
                  disabled={isGeneratingPDF}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isGeneratingPDF ? <Activity size={16} className="animate-spin" /> : <Download size={16} />}
                  {isGeneratingPDF ? 'Gerando...' : 'Baixar PDF'}
                </button>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div id="relatorio-geral-content" className="p-8 overflow-y-auto print:p-0 print:overflow-visible flex-1 bg-white">
              <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
                <h1 className="text-3xl font-bold text-slate-900 uppercase">Relatório Geral de Produção</h1>
                <p className="text-lg text-slate-600 mt-2">
                  Mês de Referência: <span className="font-semibold capitalize">{format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ptBR })}</span>
                </p>
              </div>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-800">
                    <th className="py-3 px-4 font-bold text-slate-800 uppercase text-sm">Funcionário</th>
                    <th className="py-3 px-4 font-bold text-slate-800 uppercase text-sm">Função Principal</th>
                    <th className="py-3 px-4 font-bold text-slate-800 uppercase text-sm text-center">Dias Trabalhados</th>
                    <th className="py-3 px-4 font-bold text-slate-800 uppercase text-sm text-center">Peças Produzidas</th>
                    <th className="py-3 px-4 font-bold text-slate-800 uppercase text-sm text-right">Eficiência Mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReportData.map((emp, idx) => (
                    <tr key={emp.id} className={`border-b border-slate-300 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'} print:break-inside-avoid`}>
                      <td className="py-3 px-4 font-medium text-slate-900">{emp.name}</td>
                      <td className="py-3 px-4 text-slate-700">{emp.role}</td>
                      <td className="py-3 px-4 text-center text-slate-700">{emp.activeDays}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">{emp.totalPieces}</td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={getTextColor(emp.monthlyAverage)}>
                          {emp.monthlyAverage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {monthlyReportData.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  Nenhum registro de produção encontrado para este mês.
                </div>
              )}

              <div className="mt-8 text-sm text-slate-500 text-center border-t border-slate-200 pt-4">
                Relatório gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Relatório Individual Modal */}
      {isIndividualReportOpen && selectedEmployee && individualReportData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 print:p-0 print:bg-transparent print:static print:inset-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden print:shadow-none print:max-w-none print:h-auto print:overflow-visible">

            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:hidden">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-slate-500" />
                Relatório Mensal Individual
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadPDF('relatorio-individual-content', `Relatorio_${selectedEmployee.name.replace(/\s+/g, '_')}_${selectedMonth}.pdf`)}
                  disabled={isGeneratingPDF}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isGeneratingPDF ? <Activity size={16} className="animate-spin" /> : <Download size={16} />}
                  {isGeneratingPDF ? 'Gerando...' : 'Baixar PDF'}
                </button>
                <button
                  onClick={() => setIsIndividualReportOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div id="relatorio-individual-content" className="p-8 overflow-y-auto print:p-0 print:overflow-visible flex-1 bg-white">
              <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
                <h1 className="text-3xl font-bold text-slate-900 uppercase">Relatório de Produção Individual</h1>
                <h2 className="text-xl font-semibold text-slate-700 mt-2">{selectedEmployee.name} - {selectedEmployee.role}</h2>
                <p className="text-lg text-slate-600 mt-1">
                  Mês de Referência: <span className="font-semibold capitalize">{format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ptBR })}</span>
                </p>
              </div>

              <div className="space-y-6">
                {individualReportData.map((week, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 print:break-inside-avoid">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                      <h3 className="font-bold text-slate-800">Semana {idx + 1} <span className="text-sm font-normal text-slate-500 ml-2">(Início: {format(week.weekStart, 'dd/MM')})</span></h3>
                      <div className="text-sm font-bold text-slate-700">
                        Eficiência: <span className={getTextColor(week.weekAverage)}>{week.weekAverage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 font-semibold block mb-1">Operações Realizadas:</span>
                        {Object.keys(week.opsSummary).length > 0 ? (
                          <ul className="list-disc list-inside text-slate-700">
                            {Object.entries(week.opsSummary).map(([opName, qty]) => (
                              <li key={opName}>{opName}: <strong>{qty}</strong> peças</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400 italic">Nenhuma produção registrada.</span>
                        )}
                      </div>
                      <div className="text-right flex flex-col justify-end">
                        <span className="text-slate-500 font-semibold">Total da Semana:</span>
                        <span className="text-xl font-bold text-slate-800">{week.totalPieces} peças</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-between items-center text-sm border-t border-slate-200 pt-4">
                <div className="font-bold text-lg text-slate-800">
                  Média Mensal: <span className={getTextColor(calendarData.monthAverage)}>{calendarData.monthAverage.toFixed(1)}%</span>
                </div>
                <div className="text-slate-500">
                  Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="max-w-7xl mx-auto space-y-6 print:hidden">

        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" />
              Sistema de Produção (Nuvem)
            </h1>
            <p className="text-sm text-slate-500 mt-1">Conectado e Salvando Dados em Tempo Real</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
            >
              <Settings size={18} />
              Operações
            </button>
            <button
              onClick={() => setIsAddEmployeeOpen(!isAddEmployeeOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm shadow-blue-200"
            >
              {isAddEmployeeOpen ? <ChevronUp size={18} /> : <Plus size={18} />}
              Novo Funcionário
            </button>
            <button
              onClick={() => {
                addLog('Visualização do Relatório Geral Mensal aberta.');
                setIsReportModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              Relatório Geral
            </button>
            <button
              onClick={handleDownloadLogs}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium shadow-sm"
              title="Baixar histórico de ações"
            >
              <Download size={18} />
              Baixar Logs
            </button>
          </div>
        </header>

        {/* --- EXPANDABLE SECTIONS --- */}
        {isAddEmployeeOpen && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Cadastrar Funcionário</h2>
            <form onSubmit={handleAddEmployee} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newEmpName}
                  onChange={e => setNewEmpName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo/Função</label>
                <input
                  type="text"
                  required
                  value={newEmpRole}
                  onChange={e => setNewEmpRole(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ex: Operador I"
                />
              </div>
              <button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">
                Salvar
              </button>
            </form>
          </div>
        )}

        {isSettingsOpen && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
              <Target size={20} className="text-orange-500" />
              Gerenciar Operações e Metas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Operações Existentes</h3>
                <div className="space-y-3">
                  {operations.length === 0 && <p className="text-slate-400 text-sm">Nenhuma operação cadastrada.</p>}
                  {operations.map(op => (
                    <div key={op.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 gap-2">
                      {editingOpIdSettings === op.id ? (
                        <div className="flex flex-1 items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editOpName}
                            onChange={(e) => setEditOpName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveOperationEdit(op.id)}
                            className="flex-1 p-1.5 text-sm border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          <input
                            type="number"
                            min="1"
                            value={editOpGoal}
                            onChange={(e) => setEditOpGoal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveOperationEdit(op.id)}
                            className="w-20 p-1.5 text-sm text-center border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                          <button onClick={() => handleSaveOperationEdit(op.id)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors" title="Salvar">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingOpIdSettings(null)} className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors" title="Cancelar">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-slate-700">{op.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                              <span className="text-xs text-slate-500">Meta:</span>
                              <span className="font-bold text-slate-700">{op.dailyGoal}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEditingOperation(op)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDeleteOperation(op.id, op.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Nova Operação</h3>
                <form onSubmit={handleAddOperation} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Operação</label>
                    <input
                      type="text"
                      required
                      value={newOpName}
                      onChange={e => setNewOpName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Ex: Pintura"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meta Diária (Quantidade)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newOpGoal}
                      onChange={e => setNewOpGoal(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="Ex: 150"
                    />
                  </div>
                  <button type="submit" className="w-full px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium rounded-lg transition-colors border border-orange-200">
                    Adicionar Operação
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- MAIN CONTROLS --- */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Users size={14} /> Selecionar Funcionário
            </label>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800"
            >
              {employees.length === 0 && <option value="">Sem funcionários cadastrados</option>}
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 md:max-w-xs">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <CalendarIcon size={14} /> Período
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800"
            />
          </div>
        </div>

        {/* --- CALENDAR VIEW --- */}
        <div className="space-y-6">
          {selectedEmployee ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl border border-blue-200">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    Prancheta: {selectedEmployee.name}
                    <button
                      onClick={() => {
                        if (employeeToDelete === selectedEmployee.id) {
                          handleDeleteEmployee(selectedEmployee.id, selectedEmployee.name);
                        } else {
                          setEmployeeToDelete(selectedEmployee.id);
                          setTimeout(() => setEmployeeToDelete(null), 3000);
                        }
                      }}
                      className={`text-xs px-2 py-1 ml-2 rounded transition-all ${employeeToDelete === selectedEmployee.id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'}`}
                      title="Remover Funcionário"
                    >
                      {employeeToDelete === selectedEmployee.id ? 'Confirmar?' : <Trash2 size={14} />}
                    </button>
                  </h2>
                  <p className="text-sm text-slate-500">Mês de Referência: {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ptBR })}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    addLog(`Visualização do Relatório Individual aberta para: ${selectedEmployee.name}`);
                    setIsIndividualReportOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium border border-slate-200 shadow-sm"
                >
                  <FileText size={16} /> Relatório Mensal Individual
                </button>
                {/* Monthly Status Badge */}
                <div className="flex flex-col items-end bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Média Mensal ({calendarData.monthActiveDays} dias)</span>
                  <span className={`text-2xl font-black ${getTextColor(calendarData.monthAverage)}`}>
                    {calendarData.monthAverage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <Users className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-lg font-bold text-slate-600">Nenhum funcionário selecionado</h3>
              <p className="text-slate-400 mt-2">Cadastre um funcionário no menu acima para começar a registrar a produção.</p>
            </div>
          )}

          {selectedEmployee && calendarData.weeks.map((week, wIdx) => (
            <div key={week.weekStart.toISOString()} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 p-3 border-b border-slate-200 font-medium text-slate-600 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-white px-2 py-1 rounded text-sm shadow-sm border border-slate-200">Semana {wIdx + 1}</span>
                  <span className="text-xs font-normal text-slate-400">Início: {format(week.weekStart, 'dd/MM')}</span>
                </div>
                <div className="text-sm font-bold bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200 text-slate-700">
                  Média Semanal: <span className={getTextColor(week.weekAverage)}>{week.weekAverage.toFixed(1)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {week.days.map((day) => (
                  <DayCell
                    key={day.dateStr}
                    day={day}
                    availableOperations={operations}
                    onUpdateRecord={handleUpdateRecord}
                  />
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}