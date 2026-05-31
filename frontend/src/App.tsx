import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, Trash2, Calendar, Tag, 
  ShoppingBag, RefreshCw, AlertCircle, Sparkles, 
  TrendingUp, Layers, CheckCircle2, XCircle,
  MessageSquare, Send, Bot, X, Plus, Edit,
  ZoomIn, ZoomOut, RotateCw, Search, FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import './App.css';

// Harcama içerisindeki ürün kalemleri için tip tanımı
interface ReactExpenseItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

// Harcama veri modeli için tip tanımı (TypeScript)
interface Expense {
  id: number;
  amount: number;
  storeName: string;
  category: string;
  type?: string; // Gelir veya Gider
  expenseDate: string;
  receiptImageUrl: string | null;
  createdAt: string;
  items: ReactExpenseItem[]; // Fişin içerisindeki ürün kalemleri
}

export default function App() {
  // User & Authentication States
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; email: string } | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Google Authentication Simulation States
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // Setup Axios Header and filter endpoints on load and session changes
  useEffect(() => {
    if (currentUser) {
      axios.defaults.headers.common['X-User-Id'] = currentUser.id;
    } else {
      delete axios.defaults.headers.common['X-User-Id'];
    }
  }, [currentUser]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      setErrorMessage('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    if (authMode === 'register' && !authEmail.trim()) {
      setErrorMessage('Kayıt olmak için e-posta adresi gereklidir.');
      return;
    }
    if (authMode === 'forgot' && !authEmail.trim()) {
      setErrorMessage('Şifre sıfırlamak için kayıtlı e-posta adresiniz gereklidir.');
      return;
    }
    if ((authMode === 'register' || authMode === 'forgot') && authPassword !== confirmPassword) {
      setErrorMessage('Şifreler birbiriyle eşleşmiyor. Lütfen tekrar kontrol edin.');
      return;
    }

    setAuthLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let url = '';
      let payload = {};
      const baseAuthUrl = API_BASE_URL.replace('/expenses', '/auth');

      if (authMode === 'login') {
        url = `${baseAuthUrl}/login`;
        payload = { username: authUsername, password: authPassword };
      } else if (authMode === 'register') {
        url = `${baseAuthUrl}/register`;
        payload = { username: authUsername, password: authPassword, email: authEmail };
      } else {
        url = `${baseAuthUrl}/forgot-password`;
        payload = { username: authUsername, email: authEmail, newPassword: authPassword };
      }

      const response = await axios.post(url, payload);
      
      if (authMode === 'login') {
        const user = response.data; // { id: number, username: string, email: string }
        localStorage.setItem('currentUser', JSON.stringify(user));
        setCurrentUser(user);
        setSuccessMessage(`Hoş geldiniz, ${user.username}!`);
        // Reset form
        setAuthUsername('');
        setAuthPassword('');
        setConfirmPassword('');
        setAuthEmail('');
      } else if (authMode === 'register') {
        setSuccessMessage('Kayıt işlemi başarılı! Şimdi giriş yapabilirsiniz.');
        setAuthMode('login');
        setAuthPassword('');
        setConfirmPassword('');
      } else {
        setSuccessMessage('Şifreniz başarıyla sıfırlandı! Yeni şifrenizle giriş yapabilirsiniz.');
        setAuthMode('login');
        setAuthPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Kimlik doğrulama işlemi sırasında hata oluştu.';
      setErrorMessage(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setExpenses([]);
    setSuccessMessage('Başarıyla çıkış yapıldı.');
  };

  const handleGoogleLogin = async (email: string, name: string) => {
    if (!email.trim()) return;

    setAuthLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const baseAuthUrl = API_BASE_URL.replace('/expenses', '/auth');
      const response = await axios.post(`${baseAuthUrl}/google`, {
        email: email.trim(),
        name: name.trim()
      });

      const user = response.data; // { id: number, username: string, email: string }
      localStorage.setItem('currentUser', JSON.stringify(user));
      setCurrentUser(user);
      setSuccessMessage(`Google ile giriş yapıldı. Hoş geldiniz, ${user.username}!`);
      
      // Reset simulator values & modal
      setCustomGoogleEmail('');
      setCustomGoogleName('');
      setShowGoogleModal(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Google ile giriş yaparken hata oluştu.';
      setErrorMessage(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'connected' | 'offline'>('offline');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null); // Akordeon için genişletilen satır ID'si

  const toggleRow = (id: number) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [newExpenseType, setNewExpenseType] = useState<'Gelir' | 'Gider'>('Gider');

  const openEditModal = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setNewExpenseStore(expense.storeName);
    setNewExpenseAmount(String(expense.amount));
    setNewExpenseCategory(expense.category);
    setNewExpenseType((expense.type as 'Gelir' | 'Gider') || 'Gider');
    setNewExpenseDate(expense.expenseDate.substring(0, 16));
    setNewExpenseItems(expense.items ? expense.items.map(it => ({ name: it.name, price: it.price, quantity: it.quantity })) : []);
    setManualModalOpen(true);
  };

  // --- YENİ BÖLÜM: İNTERAKTİF FİNANSAL TAKVİM STATE'LERİ & YARDIMCI METOTLARI ---
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'receipts'>('list');
  const [inspectorExpense, setInspectorExpense] = useState<Expense | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [receiptCategoryFilter, setReceiptCategoryFilter] = useState('');
  const [reanalyzingId, setReanalyzingId] = useState<number | null>(null);

  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null); // YYYY-MM-DD
  const [calendarDayExpandedRowId, setCalendarDayExpandedRowId] = useState<number | null>(null); // Takvim altındaki akordeon için

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
    setSelectedCalendarDay(null);
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
    setSelectedCalendarDay(null);
  };

  const handleResetToToday = () => {
    const today = new Date();
    setCalendarYear(today.getFullYear());
    setCalendarMonth(today.getMonth());
    setSelectedCalendarDay(null);
  };

  // Harcamaları YYYY-MM-DD olarak gruplayıp, günlük net tutarı (Gelirler (+), Giderler (-)) hesaplayan metot
  const getExpensesByDate = () => {
    const map: { [key: string]: { total: number; list: Expense[] } } = {};
    expenses.forEach(exp => {
      if (!exp.expenseDate) return;
      const dateKey = exp.expenseDate.substring(0, 10);
      if (!map[dateKey]) {
        map[dateKey] = { total: 0, list: [] };
      }
      if (exp.type === 'Gelir') {
        map[dateKey].total += exp.amount;
      } else {
        map[dateKey].total -= exp.amount;
      }
      map[dateKey].list.push(exp);
    });
    return map;
  };

  // Yıllık görünüm için harcamaları aylara göre gruplayıp Gelir vs Gider karşılaştırması sunan fonksiyon
  const getYearlyChartData = () => {
    const months = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    
    const data = months.map(m => ({
      name: m,
      Gelir: 0,
      Gider: 0
    }));

    expenses.forEach(exp => {
      if (!exp.expenseDate) return;
      const date = new Date(exp.expenseDate);
      const year = date.getFullYear();
      
      if (year === calendarYear) {
        const monthIndex = date.getMonth();
        if (exp.type === 'Gelir') {
          data[monthIndex].Gelir += exp.amount;
        } else {
          data[monthIndex].Gider += exp.amount;
        }
      }
    });

    return data;
  };

  const handleReanalyzeReceipt = async (id: number) => {
    if (reanalyzingId !== null) return;
    if (!window.confirm('Bu fişi yapay zeka (Gemini 2.5 Flash) ile sıfırdan tekrar analiz etmek istediğinizden emin misiniz? Bu işlem mevcut tutar, işletme adı ve ürün detaylarını güncelleyecektir.')) return;

    setReanalyzingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post<Expense>(`${API_BASE_URL}/${id}/reanalyze`);
      setSuccessMessage(`"${response.data.storeName}" fişi başarıyla yeniden analiz edildi!`);
      // Update local expense state
      setExpenses(prev => prev.map(exp => exp.id === id ? response.data : exp));
      // Update inspectorExpense if open
      if (inspectorExpense && inspectorExpense.id === id) {
        setInspectorExpense(response.data);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Yeniden analiz sırasında sunucu hatası oluştu.';
      setErrorMessage(errorMsg);
    } finally {
      setReanalyzingId(null);
    }
  };

  const getFilteredReceipts = () => {
    return expenses.filter(exp => {
      // Must have a receipt image
      if (!exp.receiptImageUrl) return false;

      // Filter by category
      if (receiptCategoryFilter && exp.category !== receiptCategoryFilter) return false;

      // Search query
      if (receiptSearchQuery.trim()) {
        const query = receiptSearchQuery.toLowerCase().trim();
        const storeMatch = exp.storeName.toLowerCase().includes(query);
        const catMatch = exp.category.toLowerCase().includes(query);
        const amountMatch = String(exp.amount).includes(query);
        const itemMatch = exp.items && exp.items.some(item => item.name.toLowerCase().includes(query));

        return storeMatch || catMatch || amountMatch || itemMatch;
      }

      return true;
    });
  };

  // --- CHATBOT DERSİ: YAPAY ZEKA SOHBET BOTU STATE VE METOTLARI ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{sender: 'user' | 'bot', text: string}[]>([
    { sender: 'bot', text: 'Merhaba! Ben sizin akıllı bütçe danışmanınızım. Veritabanınızdaki harcamaları analiz ederek size özel tasarruf tavsiyeleri verebilirim. Bana harcamalarınızla ilgili dilediğinizi sorabilirsiniz! 🧾✨' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      // Backend /api/expenses/chat endpoint'ine kullanıcının sorusunu gönderiyoruz
      const response = await axios.post<{response: string}>(`${API_BASE_URL}/chat`, {
        message: userText
      });
      setChatMessages(prev => [...prev, { sender: 'bot', text: response.data.response }]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Üzgünüm, bütçe danışmanına bağlanırken bir sunucu hatası oluştu.';
      setChatMessages(prev => [...prev, { sender: 'bot', text: errorMsg }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- BÜTÇE LİMİTLERİ VE ALARM SİSTEMİ STATE'LERİ ---
  const [budgetLimits, setBudgetLimits] = useState<{[key: string]: number}>(() => {
    const savedLimits = localStorage.getItem('budgetLimits');
    const defaults = {
      'Market': 1000,
      'Gıda': 1500,
      'Ulaşım': 500,
      'Eğlence': 1000,
      'Faturalar': 2000,
      'Giyim': 1500,
      'Kredi Kartı': 20000,
      'Diğer': 1000
    };
    if (savedLimits) {
      const parsed = JSON.parse(savedLimits);
      return { ...defaults, ...parsed };
    }
    return defaults;
  });
  const [editingLimits, setEditingLimits] = useState(false);
  const [tempLimits, setTempLimits] = useState<{[key: string]: number}>({...budgetLimits});

  const handleSaveLimits = () => {
    setBudgetLimits(tempLimits);
    localStorage.setItem('budgetLimits', JSON.stringify(tempLimits));
    setEditingLimits(false);
    setSuccessMessage('Bütçe limitleri başarıyla güncellendi.');
  };

  const handleCancelLimits = () => {
    setTempLimits({...budgetLimits});
    setEditingLimits(false);
  };

  // --- MANUEL GİDER EKLEME VE DİNAMİK KATEGORİ STATE'LERİ ---
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [newExpenseStore, setNewExpenseStore] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('Market');
  const [newExpenseDate, setNewExpenseDate] = useState(new Date().toISOString().substring(0, 16));
  const [newExpenseItems, setNewExpenseItems] = useState<{name: string, price: number, quantity: number}[]>([]);

  const [tempItemName, setTempItemName] = useState('');
  const [tempItemPrice, setTempItemPrice] = useState('');
  const [tempItemQty, setTempItemQty] = useState('1');

  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('customCategories');
    const defaults = ['Market', 'Gıda', 'Ulaşım', 'Eğlence', 'Faturalar', 'Giyim', 'Kredi Kartı', 'Diğer'];
    if (saved) {
      const parsed = JSON.parse(saved);
      const combined = Array.from(new Set([...defaults, ...parsed]));
      return combined;
    }
    return defaults;
  });

  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('customIncomeCategories');
    return saved ? JSON.parse(saved) : ['Maaş', 'Freelance', 'Yatırım', 'Diğer Gelir'];
  });

  const [categoryHexColors, setCategoryHexColors] = useState<{[key: string]: string}>(() => {
    const saved = localStorage.getItem('categoryHexColors');
    const defaults = {
      'Gıda': '#10b981', // emerald-500
      'Market': '#f59e0b', // amber-500
      'Ulaşım': '#06b6d4', // cyan-500
      'Eğlence': '#8b5cf6', // purple-500
      'Giyim': '#ec4899', // pink-500
      'Faturalar': '#f43f5e', // rose-500
      'Kredi Kartı': '#6366f1', // indigo-500
      'Diğer': '#64748b',  // slate-500
      'Maaş': '#10b981', // emerald-500
      'Freelance': '#06b6d4', // cyan-500
      'Yatırım': '#8b5cf6', // purple-500
      'Diğer Gelir': '#64748b' // slate-500
    };
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
    return defaults;
  });

  const getCategoryBadgeStyle = (category: string) => {
    const hex = categoryHexColors[category] || '#64748b';
    return {
      backgroundColor: `${hex}15`,
      color: hex,
      border: `1px solid ${hex}30`
    };
  };

  const handleAddCategory = (name: string, hexColor: string) => {
    if (newExpenseType === 'Gelir') {
      if (customIncomeCategories.includes(name)) return;
      const updatedCats = [...customIncomeCategories, name];
      setCustomIncomeCategories(updatedCats);
      localStorage.setItem('customIncomeCategories', JSON.stringify(updatedCats));
    } else {
      if (customCategories.includes(name)) return;
      const updatedCats = [...customCategories, name];
      setCustomCategories(updatedCats);
      localStorage.setItem('customCategories', JSON.stringify(updatedCats));

      const updatedLimits = { ...budgetLimits, [name]: 1000 };
      setBudgetLimits(updatedLimits);
      localStorage.setItem('budgetLimits', JSON.stringify(updatedLimits));
    }

    const updatedHex = { ...categoryHexColors, [name]: hexColor };
    setCategoryHexColors(updatedHex);
    localStorage.setItem('categoryHexColors', JSON.stringify(updatedHex));
  };

  const handleCreateNewCategory = () => {
    if (!newCatName.trim()) return;
    const formattedName = newCatName.trim();
    handleAddCategory(formattedName, newCatColor);
    setNewExpenseCategory(formattedName);
    setNewCatName('');
    setShowNewCatForm(false);
  };

  const handleAddTempItem = () => {
    if (!tempItemName.trim() || !tempItemPrice) return;
    const unitPrice = Number(tempItemPrice);
    const qty = Number(tempItemQty) || 1;
    setNewExpenseItems([...newExpenseItems, {
      name: tempItemName.trim(),
      price: Number((unitPrice * qty).toFixed(2)), // Row total price (Unit price * Quantity)
      quantity: qty
    }]);
    setTempItemName('');
    setTempItemPrice('');
    setTempItemQty('1');
  };

  const handleRemoveTempItem = (index: number) => {
    setNewExpenseItems(newExpenseItems.filter((_, i) => i !== index));
  };

  const handleAddManualExpense = async (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // Listedeki tüm ürünlerin toplamını bul, yoksa girilen tutarı al
    const finalAmount = newExpenseItems.length > 0
      ? newExpenseItems.reduce((sum, item) => sum + item.price, 0)
      : Number(newExpenseAmount);

    if (!newExpenseStore.trim() || (!finalAmount && finalAmount !== 0)) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        storeName: newExpenseStore,
        amount: Number(finalAmount.toFixed(2)),
        category: newExpenseCategory,
        type: newExpenseType,
        expenseDate: newExpenseDate + ":00",
        items: newExpenseItems
      };

      if (editingExpenseId !== null) {
        const response = await axios.put<Expense>(`${API_BASE_URL}/${editingExpenseId}`, payload);
        setSuccessMessage(`"${response.data.storeName}" kaydı başarıyla güncellendi!`);
      } else {
        const response = await axios.post<Expense>(API_BASE_URL, payload);
        setSuccessMessage(`Manuel kayıt "${response.data.storeName}" başarıyla eklendi!`);
      }
      
      setNewExpenseStore('');
      setNewExpenseAmount('');
      setNewExpenseCategory('Market');
      setNewExpenseType('Gider');
      setNewExpenseDate(new Date().toISOString().substring(0, 16));
      setNewExpenseItems([]);
      setEditingExpenseId(null);
      setManualModalOpen(false);

      fetchExpenses();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Kayıt eklenirken/güncellenirken bir sunucu hatası oluştu.';
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // --- YENİ PREMİUM GENİŞLETMELER (🎙️ AI QUICK INPUT, 📊 AI INSIGHTS, 📥 CSV EXPORT) ---
  const [quickInput, setQuickInput] = useState('');
  const [quickInputLoading, setQuickInputLoading] = useState(false);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportScore, setReportScore] = useState(75);
  const [loadingReport, setLoadingReport] = useState(false);

  const handleQuickInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || quickInputLoading) return;

    setQuickInputLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post<Expense>(`${API_BASE_URL}/quick-input`, {
        message: quickInput
      });
      setSuccessMessage(`Yapay zeka cümlenizi çözümledi! "${response.data.storeName}" harcaması ₺${response.data.amount} tutarıyla kaydedildi.`);
      setQuickInput('');
      fetchExpenses();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Yapay zeka harcama metnini çözümlerken bir sunucu hatası oluştu.';
      setErrorMessage(errorMsg);
    } finally {
      setQuickInputLoading(false);
    }
  };

  const handleGenerateAIReport = async () => {
    if (expenses.length === 0 || loadingReport) return;
    setLoadingReport(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post<{response: string}>(`${API_BASE_URL}/analysis-report`);
      const text = response.data.response;
      
      const scoreMatch = text.match(/\[SCORE\](\d+)\[\/SCORE\]/);
      if (scoreMatch && scoreMatch[1]) {
        setReportScore(Number(scoreMatch[1]));
      } else {
        setReportScore(75);
      }
      
      setReportText(text);
      setReportModalOpen(true);
      setSuccessMessage('Yapay zeka bütçe analiz raporunuz başarıyla hazırlandı!');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'AI Tasarruf Raporu oluşturulurken sunucu hatası oluştu.';
      setErrorMessage(errorMsg);
    } finally {
      setLoadingReport(false);
    }
  };

  const cleanReportText = (text: string) => {
    return text.replace(/\[SCORE\]\d+\[\/SCORE\]/, '').trim();
  };

  const downloadCSV = () => {
    if (expenses.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID;Mekan;Kategori;Tarih;Tutar;Urunler\n";

    expenses.forEach(exp => {
      const itemsStr = exp.items 
        ? exp.items.map(item => `${item.name}(x${item.quantity}-${item.price}TL)`).join(" | ")
        : "";
      const dateStr = new Date(exp.expenseDate).toLocaleDateString('tr-TR');
      csvContent += `${exp.id};"${exp.storeName.replace(/"/g, '""')}";"${exp.category}";${dateStr};${exp.amount};"${itemsStr}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AI_Butce_Harcamalari_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/expenses';

  // 1. Sayfa ilk açıldığında harcamaları backend'den çeken ve sistem durumunu kontrol eden fonksiyon
  const fetchExpenses = async () => {
    if (!currentUser) return;
    try {
      const response = await axios.get<Expense[]>(API_BASE_URL);
      setExpenses(response.data.reverse()); // En son yüklenen harcama en üstte görünsün
      setSystemStatus('connected');
      setErrorMessage(null);
    } catch (error) {
      setSystemStatus('offline');
      setErrorMessage('Backend sunucusuna (localhost:8080) bağlanılamadı. Lütfen Spring Boot uygulamanızı başlatın.');
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchExpenses();
      // 30 saniyede bir durumu kontrol et
      const interval = setInterval(fetchExpenses, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // 2. Fiş görseli yükleme ve analiz etme fonksiyonu
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post<Expense>(`${API_BASE_URL}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccessMessage(`${response.data.storeName} fişi başarıyla analiz edildi ve kaydedildi!`);
      fetchExpenses(); // Listeyi güncelle
    } catch (error: any) {
      console.error(error);
      const errorDetail = error.response?.data?.message || 'Gemini API veya sunucu kaynaklı bir analiz hatası oluştu. Lütfen API anahtarınızı kontrol edin.';
      setErrorMessage(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  // 3. Harcama kaydı silme fonksiyonu
  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Bu harcama kaydını silmek istediğinizden emin misiniz?')) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      setSuccessMessage('Harcama kaydı başarıyla silindi.');
      fetchExpenses(); // Listeyi güncelle
    } catch (error) {
      setErrorMessage('Kayıt silinirken bir sunucu hatası oluştu.');
    }
  };

  // 4. Sürükle Bırak (Drag & Drop) Olayları
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFileUpload(file);
      } else {
        setErrorMessage('Lütfen sadece bir görsel dosyası (JPEG, PNG) yükleyin.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileUpload(file);
    }
  };

  // 5. Analitik Bilgileri Hesaplama (Gelir & Gider Destekli)
  const totalIncome = expenses.filter(item => item.type === 'Gelir').reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenses.filter(item => item.type !== 'Gelir').reduce((sum, item) => sum + item.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const categoryCounts = expenses.filter(item => item.type !== 'Gelir').reduce((acc: {[key: string]: number}, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});



  // Limiti aşan kategorileri bul
  const exceededCategories = Object.keys(categoryCounts).filter(category => {
    const spent = categoryCounts[category] || 0;
    const limit = budgetLimits[category];
    return limit !== undefined && spent > limit;
  });

  // Harcama trendi verisini günlere göre gruplayan ve hazırlayan fonksiyon
  const getTrendData = () => {
    if (expenses.length === 0) return [];
    
    // Tarihlere göre harcamaları (Giderleri) topla
    const dailyExpenses = expenses.filter(item => item.type !== 'Gelir').reduce((acc: {[key: string]: number}, item) => {
      const dateStr = new Date(item.expenseDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      acc[dateStr] = (acc[dateStr] || 0) + item.amount;
      return acc;
    }, {});

    // Tarih bazlı objeyi recharts dizisine dönüştür (Kronolojik sırada göstermek için reverse ederiz)
    return Object.keys(dailyExpenses).map(date => ({
      date,
      tutar: Number(dailyExpenses[date].toFixed(2))
    })).reverse();
  };

  // Kategori dağılımını recharts formatına dönüştüren fonksiyon
  const getCategoryData = () => {
    return Object.keys(categoryCounts).map(category => ({
      name: category,
      value: Number(categoryCounts[category].toFixed(2))
    }));
  };



  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex items-center justify-center relative overflow-hidden px-4">
        {/* Arka Plan Glow Efektleri (Premium Tasarım) */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo ve Başlık */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-3.5 rounded-2xl shadow-xl shadow-indigo-600/30 mb-4 animate-pulse">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-indigo-400 bg-clip-text text-transparent">
              AI Budget Assistant
            </h1>
            <p className="text-xs text-slate-400 mt-2 text-center max-w-xs leading-relaxed">
              Yapay Zeka Destekli Kişisel Finans ve Çok Kullanıcılı SaaS Yönetim Paneli
            </p>
          </div>

          {/* Glassmorphic Form Card */}
          <div className="backdrop-blur-2xl bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none"></div>
            
            {/* Login / Register Tab Toggle */}
            {authMode !== 'forgot' ? (
              <div className="flex bg-slate-950/80 p-1 rounded-xl mb-6 border border-slate-800/50">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setErrorMessage(null); setSuccessMessage(null); setAuthPassword(''); setConfirmPassword(''); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                    authMode === 'login'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setErrorMessage(null); setSuccessMessage(null); setAuthPassword(''); setConfirmPassword(''); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                    authMode === 'register'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Hesap Oluştur
                </button>
              </div>
            ) : (
              <div className="text-center mb-6">
                <h2 className="text-sm font-extrabold text-white">Şifremi Unuttum</h2>
                <p className="text-[10px] text-slate-400 mt-1">Bilgilerinizi doğrulayarak şifrenizi sıfırlayın</p>
              </div>
            )}

            {/* Bildirim Alanı */}
            {errorMessage && (
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl mb-6 text-xs backdrop-blur-md">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl mb-6 text-xs backdrop-blur-md">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kullanıcı Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Kullanıcı adınızı girin"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300"
                />
              </div>

              {authMode !== 'login' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {authMode === 'register' ? 'E-Posta Adresi' : 'Kayıtlı E-Posta Adresi'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ornek@eposta.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {authMode === 'login' ? 'Şifre' : authMode === 'register' ? 'Şifre Oluştur' : 'Yeni Şifre'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300"
                />
              </div>

              {authMode !== 'login' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {authMode === 'register' ? 'Şifre Tekrar' : 'Yeni Şifre Tekrar'}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl text-xs font-bold transition duration-300 active:scale-95 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
              >
                {authLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <span>
                    {authMode === 'login' ? 'Giriş Yap' : authMode === 'register' ? 'Kayıt Ol' : 'Şifremi Güncelle'}
                  </span>
                )}
              </button>

              <div className="flex justify-between items-center text-[10px] text-indigo-400 pt-2 px-1">
                {authMode === 'login' ? (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setErrorMessage(null); setSuccessMessage(null); setAuthPassword(''); setConfirmPassword(''); }}
                    className="hover:text-indigo-300 transition-all font-semibold"
                  >
                    Şifremi Unuttum
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setErrorMessage(null); setSuccessMessage(null); setAuthPassword(''); setConfirmPassword(''); }}
                    className="hover:text-indigo-300 transition-all font-semibold"
                  >
                    Geri Dön (Giriş Yap)
                  </button>
                )}
              </div>
            </form>

            {/* Google ile Giriş Separator & Button */}
            {authMode !== 'forgot' && (
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="w-full py-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:text-slate-100 rounded-xl text-xs font-bold transition duration-300 active:scale-95 flex items-center justify-center gap-2.5 shadow-md"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.47c0,-0.61 -0.05,-1.2 -0.16,-1.7c0,0 0,0 0,0Z" fill="#4285f4" />
                      <path d="M12,20.6c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.9,0.6 -2.07,0.97 -3.33,0.97c-2.57,0 -4.75,-1.74 -5.53,-4.07H2.4v2.66c1.49,2.97 4.56,5.18 8.16,5.18Z" fill="#34a853" />
                      <path d="M6.47,12.83c-0.2,-0.6 -0.31,-1.24 -0.31,-1.9c0,-0.66 0.11,-1.3 0.31,-1.9V6.37H2.4C1.75,7.66 1.38,9.13 1.38,10.73c0,1.6 0.37,3.07 1.02,4.36l3.3,-2.66c-0.24,0 -0.24,0 0,0c0.23,0.37 0.44,0.37 0.77,0.4Z" fill="#fbbc05" />
                      <path d="M12,6.17c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.42 14.42,2.6 12,2.6C8.4,2.6 5.33,4.8 3.84,7.77l4.07,3.16c0.78,-2.33 2.96,-4.07 5.53,-4.07Z" fill="#ea4335" />
                    </g>
                  </svg>
                  <span>Google ile Giriş Yap</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Glassmorphic Google Account Simulator Modal */}
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="backdrop-blur-2xl bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="flex flex-col items-center mb-6">
                <svg className="h-8 w-8 mb-3" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 0, 0)">
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.47c0,-0.61 -0.05,-1.2 -0.16,-1.7c0,0 0,0 0,0Z" fill="#4285f4" />
                    <path d="M12,20.6c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.9,0.6 -2.07,0.97 -3.33,0.97c-2.57,0 -4.75,-1.74 -5.53,-4.07H2.4v2.66c1.49,2.97 4.56,5.18 8.16,5.18Z" fill="#34a853" />
                    <path d="M6.47,12.83c-0.2,-0.6 -0.31,-1.24 -0.31,-1.9c0,-0.66 0.11,-1.3 0.31,-1.9V6.37H2.4C1.75,7.66 1.38,9.13 1.38,10.73c0,1.6 0.37,3.07 1.02,4.36l3.3,-2.66c-0.24,0 -0.24,0 0,0c0.23,0.37 0.44,0.37 0.77,0.4Z" fill="#fbbc05" />
                    <path d="M12,6.17c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.42 14.42,2.6 12,2.6C8.4,2.6 5.33,4.8 3.84,7.77l4.07,3.16c0.78,-2.33 2.96,-4.07 5.53,-4.07Z" fill="#ea4335" />
                  </g>
                </svg>
                <h3 className="text-sm font-extrabold text-white">Google ile oturum açın</h3>
                <p className="text-[10px] text-slate-400 mt-1">Uygulamaya devam etmek için bir hesap seçin</p>
              </div>

              {/* Simüle Edilen Hesap Seçenekleri */}
              <div className="space-y-2.5 mb-6">
                <button
                  type="button"
                  onClick={() => handleGoogleLogin('muzaffer@gmail.com', 'Muzaffer')}
                  className="w-full flex items-center gap-3 p-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-xl transition duration-300 active:scale-98 text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center uppercase shrink-0">
                    M
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white leading-tight">Muzaffer</p>
                    <p className="text-[10px] text-slate-400 truncate">muzaffer@gmail.com</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGoogleLogin('demo.user@gmail.com', 'Demo User')}
                  className="w-full flex items-center gap-3 p-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-xl transition duration-300 active:scale-98 text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center uppercase shrink-0">
                    D
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white leading-tight">Demo User</p>
                    <p className="text-[10px] text-slate-400 truncate">demo.user@gmail.com</p>
                  </div>
                </button>
              </div>

              {/* Başka Hesap Ekleme / Manuel Simülasyon Girişi */}
              <div className="border-t border-slate-800/80 pt-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Farklı Google Hesabı</p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="e-posta@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition"
                  />
                  <input
                    type="text"
                    placeholder="Adınız Soyadınız"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    disabled={!customGoogleEmail.trim()}
                    onClick={() => handleGoogleLogin(customGoogleEmail, customGoogleName)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white rounded-xl text-xs font-bold transition active:scale-95"
                  >
                    Google ile Bağlan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Arka Plan Glow Efektleri (Premium Tasarım) */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl margin-0 mx-auto px-4 py-8">
        
        {/* Header / Üst Menü */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-600/30">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-400 bg-clip-text text-transparent">
                AI Budget Assistant
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Yapay Zeka Destekli Kişisel Bütçe Asistanınız</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-xs">
                <span className="text-slate-400">Hoş geldin,</span>
                <span className="font-extrabold text-indigo-400">{currentUser.username}</span>
              </div>
            )}

            {/* Sistem Durumu Rozeti */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md ${
              systemStatus === 'connected' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {systemStatus === 'connected' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {systemStatus === 'connected' ? 'Sunucu Aktif' : 'Sunucu Çevrimdışı'}
            </div>

            <button 
              onClick={fetchExpenses}
              className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition active:scale-95"
              title="Yenile"
            >
              <RefreshCw className="h-4 w-4 text-slate-400" />
            </button>

            <button 
              onClick={() => setManualModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <Plus className="h-3.5 w-3.5" /> Harcama Ekle
            </button>

            {currentUser && (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-xs font-bold transition active:scale-95"
              >
                Oturumu Kapat
              </button>
            )}
          </div>
        </header>

        {/* Uyarı ve Başarı Mesajları */}
        {errorMessage && (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3.5 rounded-xl mb-6 text-sm backdrop-blur-md">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3.5 rounded-xl mb-6 text-sm backdrop-blur-md">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Bütçe Aşım Uyarısı Banners */}
        {exceededCategories.map(category => (
          <div key={category} className="flex items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3.5 rounded-xl mb-6 text-sm backdrop-blur-md animate-pulse">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <span className="font-bold">{category}</span> bütçeniz aşıldı! Belirlenen limit: <strong>₺{budgetLimits[category]}</strong>, Harcanan: <strong className="text-rose-300">₺{categoryCounts[category].toFixed(2)}</strong>
              </div>
            </div>
          </div>
        ))}

        {/* Dashboard Kartları */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Toplam Gelir Kartı */}
          <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
            <p className="text-sm font-medium text-slate-400">Toplam Gelir</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-2 tabular-nums">
              ₺{totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 mt-4 font-bold">
              <span className="text-base">↗</span>
              <span>Kazanılan toplam nakit akışı</span>
            </div>
          </div>

          {/* Toplam Gider Kartı */}
          <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-rose-500/10 transition-colors"></div>
            <p className="text-sm font-medium text-slate-400">Toplam Gider</p>
            <h3 className="text-3xl font-extrabold text-rose-400 mt-2 tabular-nums">
              ₺{totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-rose-500 mt-4 font-bold">
              <span className="text-base">↘</span>
              <span>Yapılan toplam harcama</span>
            </div>
          </div>

          {/* Net Bütçe Kartı */}
          <div className={`bg-slate-900/40 border backdrop-blur-xl p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 ${
            netBalance >= 0 
              ? 'border-slate-800/80 hover:border-slate-700/80' 
              : 'border-rose-500/30 hover:border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-[pulse_2s_infinite]'
          }`}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-xl pointer-events-none transition-colors ${
              netBalance >= 0 ? 'bg-indigo-500/5 group-hover:bg-indigo-500/10' : 'bg-rose-500/10 group-hover:bg-rose-500/15'
            }`}></div>
            <p className="text-sm font-medium text-slate-400">Net Bütçe (Bakiye)</p>
            <h3 className={`text-3xl font-extrabold mt-2 tabular-nums ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400 font-black'}`}>
              {netBalance >= 0 ? '+' : ''}₺{netBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className={`flex items-center gap-1.5 text-xs mt-4 font-extrabold ${netBalance >= 0 ? 'text-indigo-400' : 'text-rose-400 animate-pulse'}`}>
              <span>💎</span>
              <span>{netBalance >= 0 ? 'Portföy durumunuz dengeli' : 'Bütçeniz şu an içeride!'}</span>
            </div>
          </div>
        </section>

        {/* Görsel Analitik Panel (Recharts Grafik Entegrasyonu) */}
        {expenses.length > 0 && (
          <>
            {/* AI Finansal Analiz Rapor Kartı */}
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-5 rounded-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-600/15 transition-colors"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="bg-indigo-600/10 border border-indigo-500/20 p-3 rounded-2xl shrink-0 group-hover:scale-110 transition duration-300">
                  <Bot className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    Yapay Zekalı Finans Danışmanı <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 animate-pulse">Aktif</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Tüm harcamalarınızı ve limit aşımlarını derinlemesine analiz edip tasarruf raporu hazırlayalım.</p>
                </div>
              </div>
              <button
                onClick={handleGenerateAIReport}
                disabled={loadingReport || expenses.length === 0}
                className="relative z-10 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-850 disabled:text-slate-500 text-white rounded-xl text-xs font-extrabold transition duration-300 active:scale-95 shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 shrink-0"
              >
                {loadingReport ? (
                  <>
                    <span className="w-4 h-4 border-2 border-indigo-400 border-t-white rounded-full animate-spin"></span>
                    <span>Rapor Hazırlanıyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-white animate-pulse" />
                    <span>AI Tasarruf Analizi Oluştur</span>
                  </>
                )}
              </button>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
            {/* Harcama Akışı ve Karşılaştırmalı Grafikler */}
            <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500" /> 
                  {chartViewMode === 'monthly' ? "Harcama Akışı ve Trendi (Aylık)" : "Yıllık Finansal Karşılaştırma"}
                </h2>
                
                {/* Grafik Görünüm Sekmesi */}
                <div className="flex p-0.5 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shrink-0 shadow-inner self-start sm:self-auto">
                  <button
                    onClick={() => setChartViewMode('monthly')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                      chartViewMode === 'monthly' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Aylık Akış
                  </button>
                  <button
                    onClick={() => setChartViewMode('yearly')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                      chartViewMode === 'yearly' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Yıllık Özet
                  </button>
                </div>
              </div>

              <div className="h-[260px] w-full">
                {chartViewMode === 'monthly' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getTrendData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTutar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => [`₺${value.toLocaleString('tr-TR')}`, 'Tutar']}
                      />
                      <Area type="monotone" dataKey="tutar" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTutar)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getYearlyChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => [`₺${value.toLocaleString('tr-TR')}`]}
                      />
                      <Legend 
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => <span className="text-xs text-slate-300 font-medium capitalize">{value}</span>}
                      />
                      <Bar dataKey="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Gider" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Kategori Dağılımı (Pasta Grafik) */}
            <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl flex flex-col">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" /> Kategori Bazlı Dağılım
              </h2>
              <div className="h-[260px] w-full flex-1 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getCategoryData()}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {getCategoryData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={categoryHexColors[entry.name] || '#64748b'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any) => [`₺${value.toLocaleString('tr-TR')}`, 'Harcama']}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-slate-300 font-medium capitalize">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
          </>
        )}

        {/* Ana İçerik Alanı (2 Sütunlu) */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sol Kolon: Fiş Yükleme ve Yükleme Durumu (5 Sütun) */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* AI Hızlı Harcama Giriş Alanı (🎙️ Yapay Zekaya Söyle) */}
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
              <h2 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" /> Yapay Zekaya Söyle
              </h2>
              <p className="text-xxs text-slate-400 leading-relaxed mb-4">
                Harcamanızı serbestçe yazın, Gemini saniyeler içinde analiz etsin! (Örn: "Dün Starbucks'ta kahveye 180 TL verdim")
              </p>
              <form onSubmit={handleQuickInputSubmit} className="flex gap-2">
                <input 
                  type="text"
                  required
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Dün Starbucks'ta kahveye 180 TL verdim..."
                  disabled={quickInputLoading || systemStatus === 'offline'}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700 font-semibold"
                />
                <button
                  type="submit"
                  disabled={quickInputLoading || !quickInput.trim() || systemStatus === 'offline'}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 rounded-xl text-xs font-bold transition active:scale-95 shrink-0 flex items-center justify-center font-extrabold"
                >
                  {quickInputLoading ? (
                    <span className="w-4 h-4 border-2 border-indigo-400 border-t-white rounded-full animate-spin"></span>
                  ) : "Ekle"}
                </button>
              </form>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-500" /> Fiş Analiz İstasyonu
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Yapay Zekanın analiz etmesi için bir fiş veya fatura resmi yükleyin. Tutar, mekan ve kategori bilgileri otomatik çıkarılacaktır.
              </p>

              {/* Sürükle-Bırak Alanı */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition duration-200 relative overflow-hidden group flex flex-col items-center justify-center min-h-[220px] ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-500/5' 
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/20'
                }`}
              >
                <input 
                  type="file" 
                  id="receipt-upload"
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={loading || systemStatus === 'offline'}
                />
                
                <label 
                  htmlFor="receipt-upload"
                  className={`flex flex-col items-center cursor-pointer ${
                    (loading || systemStatus === 'offline') ? 'pointer-events-none opacity-40' : ''
                  }`}
                >
                  <div className="w-14 h-14 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition duration-300 shadow-inner">
                    <Upload className="h-6 w-6 text-indigo-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">Görsel Seçin veya Sürükleyin</span>
                  <span className="text-xs text-slate-500 mt-1.5">PNG, JPG veya JPEG formatında fiş fotoğrafı</span>
                </label>

                {/* Yükleniyor / Analiz Ediliyor Scanner Animasyonu */}
                {loading && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4">
                    {/* Laser Scanner Çizgisi */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[bounce_2s_infinite]"></div>
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4"></div>
                    <span className="text-sm font-bold text-white animate-pulse">Gemini 2.5 Fişi Okuyor...</span>
                    <span className="text-xxs text-slate-500 mt-1">Harcama detayları yapay zeka ile çözümleniyor</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bütçe İlerlemesi Kartı (Premium Bütçe Limitleri ve Takip) */}
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500" /> Bütçe İlerlemesi
                </h2>
                {!editingLimits ? (
                  <button
                    onClick={() => {
                      setTempLimits({...budgetLimits});
                      setEditingLimits(true);
                    }}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Limitleri Düzenle
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLimits}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={handleCancelLimits}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-300 transition"
                    >
                      İptal
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {Object.keys(budgetLimits).map(category => {
                  const spent = categoryCounts[category] || 0;
                  const limit = budgetLimits[category];
                  const percentage = Math.min((spent / limit) * 100, 100);
                  const isOver = spent > limit;

                  // Bar rengini belirleme
                  let barColor = 'bg-emerald-500';
                  if (percentage >= 100) {
                    barColor = 'bg-rose-500 shadow-[0_0_10px_#f43f5e]';
                  } else if (percentage >= 70) {
                    barColor = 'bg-amber-500';
                  }

                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300 capitalize">{category}</span>
                        {editingLimits ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500">₺</span>
                            <input
                              type="number"
                              value={tempLimits[category] || 0}
                              onChange={(e) => setTempLimits({
                                ...tempLimits,
                                [category]: Number(e.target.value)
                              })}
                              className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-right text-white font-semibold text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        ) : (
                          <span className="font-medium text-slate-400">
                            <strong className={isOver ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                              ₺{spent.toFixed(0)}
                            </strong>
                            {' '}/{' '}
                            <span className="text-slate-500">₺{limit}</span>
                          </span>
                        )}
                      </div>
                      
                      {!editingLimits && (
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MLOps Bilgi Kartı */}
            <div className="bg-slate-900/20 border border-slate-800/50 p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-xl shrink-0">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">2026 Akıllı Mimarisi</h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Sisteminiz stable <strong>Gemini 2.5 Flash</strong> çok modlu (multimodal) modeline ve dayanıklı (robust) JSON parselleyiciye sahiptir. API güncellemelerinden etkilenmeden çalışır.
                </p>
              </div>
            </div>

          </div>

          {/* Sağ Kolon: Harcama Geçmişi Tablosu (7 Sütun) */}
          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-6 rounded-2xl flex flex-col min-h-[400px]">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-indigo-500" /> Harcama Kayıtları
                </h2>
                
                {/* Yarı Saydam Sekme Geçişi */}
                <div className="flex p-0.5 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shrink-0 shadow-inner">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                      viewMode === 'list' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📋 Liste
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                      viewMode === 'calendar' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📅 Takvim
                  </button>
                  <button
                    onClick={() => setViewMode('receipts')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-300 cursor-pointer ${
                      viewMode === 'receipts' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🧾 Fişler
                  </button>
                </div>
              </div>

              {expenses.length > 0 && (
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 rounded-lg text-xs font-bold transition active:scale-95 shadow-inner self-end sm:self-auto"
                  title="Verileri Excel / CSV olarak indir"
                >
                  <Upload className="h-3.5 w-3.5 rotate-180" /> Dışa Aktar
                </button>
              )}
            </div>

            {expenses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800/80 rounded-xl bg-slate-950/20">
                <ShoppingBag className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400">Henüz Kayıtlı Harcama Yok</p>
                <p className="text-xs text-slate-600 mt-1 max-w-[280px]">
                  Yukarıdaki analiz istasyonunu kullanarak ilk fiş görselini yükleyip başlayabilirsiniz.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">İşletme / Mekan</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4 text-right">Tutar</th>
                      <th className="py-3 px-4 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-sm">
                    {expenses.map((expense) => (
                      <React.Fragment key={expense.id}>
                        {/* Ana Harcama Satırı (Tıklanabilir Akordeon) */}
                        <tr 
                          onClick={() => toggleRow(expense.id)}
                          className={`hover:bg-slate-900/30 transition-colors group cursor-pointer ${
                            expandedRowId === expense.id ? 'bg-slate-900/25 border-l-2 border-indigo-500' : ''
                          }`}
                        >
                          
                          {/* İşletme Adı */}
                          <td className="py-4 px-4 font-semibold text-white truncate max-w-[150px]">
                            <div className="flex items-center gap-2">
                              {/* Genişleme yönünü gösteren chevron oku */}
                              <span className={`text-[10px] text-slate-500 font-bold transition duration-200 shrink-0 ${
                                expandedRowId === expense.id ? 'rotate-90 text-indigo-400' : ''
                              }`}>
                                ❯
                              </span>
                              <span>{expense.storeName}</span>
                            </div>
                          </td>
                          
                          {/* Kategori Rozeti */}
                          <td className="py-4 px-4">
                            <span 
                              style={getCategoryBadgeStyle(expense.category)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                            >
                              <Tag className="h-3 w-3 shrink-0" />
                              {expense.category}
                            </span>
                          </td>
                          
                          {/* Harcama Tarihi */}
                          <td className="py-4 px-4 text-slate-400 text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                              <span>{new Date(expense.expenseDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </td>
                          
                          {/* Toplam Tutar */}
                          <td className={`py-4 px-4 text-right font-bold tabular-nums ${expense.type === 'Gelir' ? 'text-emerald-400' : 'text-white'}`}>
                            {expense.type === 'Gelir' ? '+' : '-'}₺{expense.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          
                          {/* İşlem Butonları */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(expense);
                                }}
                                className="p-1.5 bg-slate-950/40 text-slate-500 border border-slate-800/80 rounded-lg hover:text-indigo-400 hover:border-indigo-500/20 hover:bg-indigo-500/5 transition duration-200 active:scale-90 cursor-pointer"
                                title="Harcamayı Düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Satır genişleme (akordeon) olayının tetiklenmesini engelliyoruz.
                                  handleDeleteExpense(expense.id);
                                }}
                                className="p-1.5 bg-slate-950/40 text-slate-500 border border-slate-800/80 rounded-lg hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition duration-200 active:scale-90 cursor-pointer"
                                title="Harcamayı Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          
                        </tr>

                        {/* Genişletilmiş Ürün Detay Listesi (Akordeon) */}
                        {expandedRowId === expense.id && (
                          <tr className="bg-slate-950/40 backdrop-blur-md">
                            <td colSpan={5} className="py-4 px-6 border-b border-slate-900">
                              <div className="border border-slate-800/50 rounded-2xl p-5 bg-slate-950/60">
                                <div className={`grid grid-cols-1 ${expense.receiptImageUrl ? 'lg:grid-cols-12' : ''} gap-6`}>
                                  
                                  {/* Ürün Kalemleri Listesi */}
                                  <div className={expense.receiptImageUrl ? 'lg:col-span-8' : 'w-full'}>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                      🛒 Fiş Ürün Detayları ({expense.items?.length || 0} Ürün)
                                    </h4>
                                    {(!expense.items || expense.items.length === 0) ? (
                                      <p className="text-xs text-slate-500 italic">Yapay zeka bu fiş için herhangi bir ürün detayı algılayamadı.</p>
                                    ) : (
                                      <div className={`grid grid-cols-1 ${expense.receiptImageUrl ? 'xl:grid-cols-2' : 'sm:grid-cols-2'} gap-3`}>
                                        {expense.items.map((item) => (
                                          <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/35 border border-slate-850 rounded-xl hover:border-slate-800 transition min-w-0">
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                              <span className="font-extrabold text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg shrink-0">
                                                x{item.quantity}
                                              </span>
                                              <span className="text-xs font-bold text-slate-200 truncate flex-1 min-w-0" title={item.name}>
                                                {item.name}
                                              </span>
                                            </div>
                                            <div className="text-right shrink-0 pl-2">
                                              <span className="text-xs font-extrabold text-white tabular-nums">
                                                ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                              {item.quantity > 1 && (
                                                <span className="text-slate-500 block text-[10px] mt-0.5 font-medium">
                                                  Birim: ₺{(item.price / item.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Arşivlenmiş Fiş Görseli */}
                                  {expense.receiptImageUrl && (
                                    <div className="lg:col-span-4 flex flex-col">
                                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">
                                        🧾 Arşivlenmiş Fiş Görseli
                                      </h4>
                                      <div className="relative group/img overflow-hidden rounded-xl border border-slate-800 bg-slate-950 aspect-[3/4] flex items-center justify-center">
                                        <img 
                                          src={expense.receiptImageUrl} 
                                          alt="Fiş Görseli" 
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                          <a 
                                            href={expense.receiptImageUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg transition active:scale-95 text-center"
                                          >
                                            Görseli Tam Boy Aç
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : viewMode === 'calendar' ? (
              // --- YENİ TAKVİM GÖRÜNÜMÜ ---
              (() => {
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                
                const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                let firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
                firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Pzt=0 yapma
                
                const dateMap = getExpensesByDate();
                
                const turkishMonths = [
                  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
                  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
                ];
                
                const daysOfWeek = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
                const calendarCells = [];
                
                for (let i = 0; i < firstDayIndex; i++) {
                  calendarCells.push(null);
                }
                
                for (let d = 1; d <= totalDays; d++) {
                  calendarCells.push(d);
                }
                
                return (
                  <div className="flex-1 flex flex-col select-none animate-[fadeIn_0.3s_ease-out]">
                    {/* Takvim Kontrol Başlığı */}
                    <div className="flex items-center justify-between mb-5 bg-slate-950/60 border border-slate-850/80 p-3 rounded-xl backdrop-blur-md">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handlePrevMonth}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition hover:bg-slate-850 active:scale-90 cursor-pointer text-xs font-bold"
                        >
                          ❮
                        </button>
                        <button
                          onClick={handleNextMonth}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition hover:bg-slate-850 active:scale-90 cursor-pointer text-xs font-bold"
                        >
                          ❯
                        </button>
                      </div>
                      
                      <span className="text-xs font-extrabold text-white tracking-wider uppercase">
                        {turkishMonths[calendarMonth]} {calendarYear}
                      </span>

                      <button
                        onClick={handleResetToToday}
                        className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg transition hover:bg-indigo-500/20 active:scale-95 cursor-pointer"
                      >
                        Bugün
                      </button>
                    </div>

                    {/* Takvim Tablosu */}
                    <div className="border border-slate-850/80 rounded-2xl bg-slate-950/40 p-4">
                      {/* Gün Kısaltmaları */}
                      <div className="grid grid-cols-7 text-center mb-3">
                        {daysOfWeek.map((day) => (
                          <span key={day} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1">
                            {day}
                          </span>
                        ))}
                      </div>

                      {/* Hücreler */}
                      <div className="grid grid-cols-7 gap-2">
                        {calendarCells.map((day, idx) => {
                          if (day === null) {
                            return <div key={`empty-${idx}`} className="aspect-square"></div>;
                          }

                          const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const dayExpenses = dateMap[dateKey];
                          const hasExpenses = !!dayExpenses;
                          const isSelected = selectedCalendarDay === dateKey;
                          const isToday = todayStr === dateKey;

                          return (
                            <button
                              key={`day-${day}`}
                              onClick={() => {
                                setSelectedCalendarDay(isSelected ? null : dateKey);
                                setCalendarDayExpandedRowId(null);
                              }}
                              className={`aspect-square rounded-xl border flex flex-col items-center justify-between p-1.5 transition duration-200 cursor-pointer relative group ${
                                isSelected
                                  ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                                  : hasExpenses
                                    ? 'bg-slate-900/30 border-indigo-500/30 hover:border-indigo-500/60 shadow-[0_0_8px_rgba(99,102,241,0.04)]'
                                    : isToday
                                      ? 'bg-slate-900/10 border-slate-700 hover:border-slate-650'
                                      : 'bg-slate-950/20 border-slate-900/40 hover:border-slate-800'
                              }`}
                            >
                              <span className={`text-[10px] font-bold self-start ${
                                isSelected 
                                  ? 'text-indigo-300' 
                                  : isToday
                                    ? 'text-white bg-indigo-600/40 px-1.5 py-0.5 rounded-md border border-indigo-500/20'
                                    : hasExpenses
                                      ? 'text-slate-200 font-extrabold'
                                      : 'text-slate-500'
                              }`}>
                                {day}
                              </span>

                              {hasExpenses && (
                                <span className={`text-[8px] font-extrabold bg-indigo-500/15 border border-indigo-500/20 px-1 py-0.5 rounded-md tracking-tighter tabular-nums truncate max-w-full ${dayExpenses.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {dayExpenses.total >= 0 ? '+' : ''}₺{Math.abs(dayExpenses.total).toFixed(0)}
                                </span>
                              )}

                              {hasExpenses && !isSelected && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_6px_#6366f1]"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Günlük Detay Paneli */}
                    {selectedCalendarDay && (
                      <div className="mt-5 bg-slate-950/50 border border-slate-850/80 p-5 rounded-2xl animate-[slideDown_0.25s_ease-out] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
                          <h3 className="text-xxs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                            📅 {new Date(selectedCalendarDay).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} Giderleri
                          </h3>
                          <span className={`text-xxs font-extrabold px-2.5 py-1 rounded-lg ${dateMap[selectedCalendarDay]?.total >= 0 ? 'text-emerald-400 bg-emerald-950/20 border border-emerald-500/30' : 'text-rose-400 bg-rose-950/20 border border-rose-500/30'}`}>
                            Net Bakiye: {dateMap[selectedCalendarDay]?.total >= 0 ? '+' : ''}₺{dateMap[selectedCalendarDay]?.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {(!dateMap[selectedCalendarDay] || dateMap[selectedCalendarDay].list.length === 0) ? (
                          <p className="text-xs text-slate-500 italic py-2">Bu güne ait harcama kaydı bulunamadı.</p>
                        ) : (
                          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                            {dateMap[selectedCalendarDay].list.map((expense) => {
                              const isExpanded = calendarDayExpandedRowId === expense.id;
                              return (
                                <div key={expense.id} className="border border-slate-850/60 rounded-xl bg-slate-900/10 overflow-hidden">
                                  <div 
                                    onClick={() => setCalendarDayExpandedRowId(isExpanded ? null : expense.id)}
                                    className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-900/20 transition select-none"
                                  >
                                    <div className="flex items-center gap-2.5 truncate max-w-[60%]">
                                      <span className={`text-[8px] text-slate-500 transition duration-200 ${isExpanded ? 'rotate-90 text-indigo-400' : ''}`}>
                                        ❯
                                      </span>
                                      <span className="text-xs font-bold text-white truncate">{expense.storeName}</span>
                                      <span 
                                        style={getCategoryBadgeStyle(expense.category)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold shrink-0"
                                      >
                                        {expense.category}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className={`text-xs font-extrabold ${expense.type === 'Gelir' ? 'text-emerald-400' : 'text-white'}`}>
                                        {expense.type === 'Gelir' ? '+' : '-'}₺{expense.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditModal(expense);
                                        }}
                                        className="p-1 bg-slate-950 text-slate-500 rounded border border-slate-850 hover:text-indigo-400 hover:border-indigo-500/20 hover:bg-indigo-500/5 transition cursor-pointer"
                                        title="Harcamayı Düzenle"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteExpense(expense.id);
                                          setSelectedCalendarDay(null);
                                        }}
                                        className="p-1 bg-slate-950 text-slate-500 rounded border border-slate-850 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/5 transition cursor-pointer"
                                        title="Harcamayı Sil"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="p-4 bg-slate-950/60 border-t border-slate-850/60 animate-[slideDown_0.2s_ease-out]">
                                      <div className={`grid grid-cols-1 ${expense.receiptImageUrl ? 'md:grid-cols-12' : ''} gap-4`}>
                                        <div className={expense.receiptImageUrl ? 'md:col-span-8' : 'w-full'}>
                                          <h4 className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-3">
                                            🛒 Ürün Detayları ({expense.items?.length || 0})
                                          </h4>
                                          {(!expense.items || expense.items.length === 0) ? (
                                            <p className="text-[10px] text-slate-500 italic">Ürün detayı bulunmuyor.</p>
                                          ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {expense.items.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-900/30 border border-slate-850/80 rounded-lg min-w-0">
                                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="font-extrabold text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                                                      x{item.quantity}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-200 truncate flex-1 min-w-0" title={item.name}>
                                                      {item.name}
                                                    </span>
                                                  </div>
                                                  <div className="text-right shrink-0 pl-1.5">
                                                    <span className="text-[9px] font-extrabold text-white">
                                                      ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        {expense.receiptImageUrl && (
                                          <div className="md:col-span-4 flex flex-col">
                                            <h4 className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-3">
                                              🧾 Fiş Görseli
                                            </h4>
                                            <div className="relative overflow-hidden rounded-xl border border-slate-850 bg-slate-950 aspect-[3/4] flex items-center justify-center max-w-[120px] self-start md:self-auto">
                                              <img 
                                                src={expense.receiptImageUrl} 
                                                alt="Fiş Görseli" 
                                                className="w-full h-full object-cover"
                                              />
                                              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                                                <a 
                                                  href={expense.receiptImageUrl} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-semibold transition"
                                                >
                                                  Tam Boy Aç
                                                </a>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              // --- YENİ FİŞ ARŞİVİ VE AKILLI FILTRE ISTASYONU ---
              <div className="flex-1 flex flex-col space-y-6 select-none animate-[fadeIn_0.3s_ease-out]">
                {/* Filtre İstasyonu */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-950/60 border border-slate-850/80 p-4 rounded-2xl backdrop-blur-md items-center">
                  
                  {/* Akıllı Metin Arama Kutusu */}
                  <div className="sm:col-span-8 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input 
                      type="text"
                      value={receiptSearchQuery}
                      onChange={(e) => setReceiptSearchQuery(e.target.value)}
                      placeholder="İşletme, kategori veya ürün adı ara (Örn: Kahve, Latte)..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700 font-semibold"
                    />
                  </div>

                  {/* Kategori Seçici Filtre */}
                  <div className="sm:col-span-4">
                    <select
                      value={receiptCategoryFilter}
                      onChange={(e) => setReceiptCategoryFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                    >
                      <option value="">Tüm Kategoriler</option>
                      {customCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Kart Izgarası */}
                {getFilteredReceipts().length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-800/80 rounded-2xl bg-slate-950/20">
                    <FileText className="h-10 w-10 text-slate-700 mb-3" />
                    <p className="text-sm font-medium text-slate-400">Aranan Kriterlere Uygun Fiş Bulunamadı</p>
                    <p className="text-xs text-slate-600 mt-1 max-w-[280px]">
                      Arama terimini değiştirebilir veya tüm kategorileri seçerek arşivdeki diğer fişlerinizi listeleyebilirsiniz.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {getFilteredReceipts().map((receipt: Expense) => (
                      <div 
                        key={receipt.id}
                        onClick={() => {
                          setInspectorExpense(receipt);
                          setImageZoom(1);
                          setImageRotation(0);
                        }}
                        className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-2xl overflow-hidden relative group hover:border-indigo-500/40 transition-all duration-300 cursor-pointer flex flex-col aspect-[4/5] shadow-lg hover:shadow-indigo-500/5"
                      >
                        {/* Fiş Resim Önizlemesi */}
                        <div className="flex-1 w-full overflow-hidden relative bg-slate-950">
                          <img 
                            src={receipt.receiptImageUrl || ''} 
                            alt={receipt.storeName}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90"></div>
                          
                          {/* Kategori Rozeti */}
                          <div className="absolute top-3 left-3 z-10">
                            <span 
                              style={getCategoryBadgeStyle(receipt.category)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-md"
                            >
                              <Tag className="h-2.5 w-2.5 shrink-0" />
                              {receipt.category}
                            </span>
                          </div>
                        </div>

                        {/* Fiş Açıklama ve Detay Kartı Overlay */}
                        <div className="p-4 bg-slate-950/90 border-t border-slate-850 shrink-0 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h4 className="text-sm font-extrabold text-white truncate max-w-[70%]">{receipt.storeName}</h4>
                            <span className="text-xs font-black text-emerald-400 tabular-nums">
                              ₺{receipt.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-bold">{new Date(receipt.expenseDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            <span className="text-indigo-400 font-extrabold group-hover:text-indigo-300 transition duration-300">
                              Detayları İncele ❯
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </main>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>© 2026 AI Budget Assistant - Java 25 & Spring Boot & React & Gemini Multimodal OCR</p>
        </footer>

      </div>

      {/* --- FLOATING AI CHATBOT PANEL (Premium Yüzen Sohbet Arayüzü) --- */}
      {/* Sohbet Açma / Kapatma Butonu */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all duration-300 z-50 animate-bounce"
        style={{ animationDuration: '3s' }}
        title="Bütçe Danışmanına Sor"
      >
        {chatOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Sohbet Penceresi */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-[360px] h-[480px] bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 transition-all duration-300 animate-[fadeIn_0.3s_ease-out]">
          
          {/* Chat Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-1.5 rounded-lg">
                <Bot className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Akıllı Bütçe Danışmanı</h4>
                <p className="text-[10px] text-slate-500">Gemini 2.5 Flash Destekli</p>
              </div>
            </div>
            <button 
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages (Mesajlaşma Alanı) */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {chatMessages.map((msg, i) => (
              <div 
                key={i} 
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs ${
                  msg.sender === 'user'
                    ? 'self-end bg-indigo-600 text-white rounded-br-none'
                    : 'self-start bg-slate-950 border border-slate-850 text-slate-200 rounded-bl-none leading-relaxed'
                }`}
              >
                {/* Çok satırlı çıktıları (whitespace-pre-line) destekleyecek şekilde ayarlandı */}
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="self-start bg-slate-950 border border-slate-850 text-slate-400 rounded-2xl rounded-bl-none px-3.5 py-2.5 text-xs flex items-center gap-2">
                <Bot className="h-4 w-4 animate-pulse text-indigo-400" />
                <span className="animate-pulse">Bütçeniz analiz ediliyor...</span>
              </div>
            )}
          </div>

          {/* Chat Input Form (Yazma Alanı) */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tasarruf etmek için ne yapabilirim?..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-2 rounded-xl transition duration-200 active:scale-95 flex items-center justify-center shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* --- MANUEL HARCAMA EKLEME MODALI (Premium Glassmorphic Modal) --- */}
      {manualModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600/10 border border-indigo-500/20 p-2 rounded-xl">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingExpenseId !== null ? "Harcamayı Düzenle" : "Manuel Harcama Ekle"}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {editingExpenseId !== null ? "Harcama ayrıntılarını güncelleyin" : "Yeni harcama kaydınızı veritabanına manuel işleyin"}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setManualModalOpen(false); setEditingExpenseId(null); }}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              
              {/* Gelir / Gider Tipi Seçici (Segmented Control) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Kayıt Türü</label>
                <div className="flex p-0.5 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                  <button
                    type="button"
                    onClick={() => { setNewExpenseType('Gider'); setNewExpenseCategory('Market'); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all duration-300 cursor-pointer ${
                      newExpenseType === 'Gider' 
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔴 Gider (Harcama)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewExpenseType('Gelir'); setNewExpenseCategory('Maaş'); setNewExpenseItems([]); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all duration-300 cursor-pointer ${
                      newExpenseType === 'Gelir' 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🟢 Gelir (Giriş)
                  </button>
                </div>
              </div>

              {/* İşletme / Mekan Adı */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  {newExpenseType === 'Gelir' ? 'Gelir Kaynağı / Açıklama' : 'İşletme / Mekan Adı'}
                </label>
                <input 
                  type="text"
                  required
                  value={newExpenseStore}
                  onChange={(e) => setNewExpenseStore(e.target.value)}
                  placeholder={newExpenseType === 'Gelir' ? 'Maaş, Freelance, Yatırım vb.' : 'Starbucks, Migros, Shell vb.'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700 font-semibold"
                />
              </div>

              {/* Tutar ve Tarih */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 block">Toplam Tutar (₺)</label>
                    {newExpenseItems.length > 0 && (
                      <span className="text-[9px] font-bold text-emerald-400 animate-pulse">
                        Kalemlerden otomatik hesaplandı
                      </span>
                    )}
                  </div>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={
                      newExpenseItems.length > 0
                        ? Number(newExpenseItems.reduce((sum, item) => sum + item.price, 0).toFixed(2))
                        : newExpenseAmount
                    }
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    disabled={newExpenseItems.length > 0}
                    placeholder="125.50"
                    className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold tabular-nums ${
                      newExpenseItems.length > 0 
                        ? 'opacity-60 cursor-not-allowed border-emerald-500/30 text-emerald-400 bg-emerald-500/5' 
                        : 'placeholder-slate-700'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Harcama Tarihi</label>
                  <input 
                    type="datetime-local"
                    required
                    value={newExpenseDate}
                    onChange={(e) => setNewExpenseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              </div>

              {/* Kategori Seçimi & Dinamik Kategori Ekleme */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">Kategori</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCatForm(!showNewCatForm)}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    {showNewCatForm ? "Kategori Seçimine Dön" : "+ Yeni Kategori Oluştur"}
                  </button>
                </div>

                {!showNewCatForm ? (
                  <select
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {newExpenseType === 'Gelir' ? (
                      customIncomeCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      customCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Yeni Özel Kategori Oluştur
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <input 
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Örn: Kira, Spor, Eğitim"
                        className="col-span-8 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700 font-semibold"
                      />
                      <input 
                        type="color"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        className="col-span-2 w-full h-8 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer p-0.5"
                        title="Kategori Rengi Seçin"
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewCategory}
                        className="col-span-2 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition active:scale-95 text-center"
                      >
                        Ekle
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fiş İçindeki Ürünler (Opsiyonel Kalemler) */}
              {newExpenseType !== 'Gelir' && (
                <div className="space-y-3 border-t border-slate-850 pt-4 animate-[fadeIn_0.2s_ease-out]">
                  <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                    🛒 Fiş Ürün Kalemleri (Opsiyonel)
                  </label>

                  {/* Eklenen Ürünler Önizleme */}
                  {newExpenseItems.length > 0 && (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {newExpenseItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md">
                              x{item.quantity}
                            </span>
                            <span className="text-xs font-bold text-slate-200">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-white tabular-nums">₺{item.price.toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTempItem(idx)}
                              className="text-slate-500 hover:text-rose-400 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ürün Ekleme Alt Formu */}
                  <div className="grid grid-cols-12 gap-2 bg-slate-950/40 p-3.5 border border-slate-850 rounded-xl items-end">
                    <div className="col-span-6 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400">Ürün Adı</span>
                      <input 
                        type="text"
                        value={tempItemName}
                        onChange={(e) => setTempItemName(e.target.value)}
                        placeholder="Latte, Süt, Gömlek vb."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700 font-semibold"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400">Fiyat (₺)</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={tempItemPrice}
                        onChange={(e) => setTempItemPrice(e.target.value)}
                        placeholder="45.00"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700 font-bold tabular-nums"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400">Adet</span>
                      <input 
                        type="number"
                        value={tempItemQty}
                        onChange={(e) => setTempItemQty(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center pb-0.5">
                      <button
                        type="button"
                        onClick={handleAddTempItem}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition active:scale-95 flex items-center justify-center"
                        title="Ürün Ekle"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer / Submit Button */}
              <div className="border-t border-slate-850 pt-5 flex items-center justify-end gap-3 bg-slate-900/90 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => { setManualModalOpen(false); setEditingExpenseId(null); }}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleAddManualExpense}
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  {loading ? (editingExpenseId !== null ? "Güncelleniyor..." : "Kaydediliyor...") : (editingExpenseId !== null ? "Güncelle" : "Kaydet")}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- AI TASARRUF ANALİZİ RAPOR MODALI (Circular Score & Markdown) --- */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600/10 border border-indigo-500/20 p-2 rounded-xl">
                  <Bot className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Yapay Zekalı Finans Raporu</h3>
                  <p className="text-[10px] text-slate-500">Gemini 2.5 Flash tarafından bütçenize özel oluşturuldu</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              
              {/* Circular Score Wheel & Health Status */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-5 bg-slate-950/60 border border-slate-850 rounded-2xl">
                
                {/* Score Wheel */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="56" cy="56" r="48" 
                      className="text-slate-800" strokeWidth="8" stroke="currentColor" fill="transparent"
                    />
                    <circle 
                      cx="56" cy="56" r="48" 
                      style={{
                        strokeDasharray: `${2 * Math.PI * 48}`,
                        strokeDashoffset: `${2 * Math.PI * 48 * (1 - reportScore / 100)}`
                      }}
                      className={`${
                        reportScore >= 80 
                          ? 'text-emerald-500 shadow-[0_0_10px_#10b981]' 
                          : reportScore >= 50 
                            ? 'text-amber-500 shadow-[0_0_10px_#f59e0b]' 
                            : 'text-rose-500 shadow-[0_0_10px_#f43f5e]'
                      } transition-all duration-1000`} 
                      strokeWidth="8" strokeLinecap="round" stroke="currentColor" fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-extrabold text-white tabular-nums">{reportScore}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">SKOR</span>
                  </div>
                </div>

                {/* Score Commentary */}
                <div className="text-center sm:text-left space-y-1.5">
                  <h4 className="text-sm font-extrabold text-white">
                    Finansal Sağlık Durumu: {' '}
                    <span className={
                      reportScore >= 80 ? 'text-emerald-400' : reportScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                    }>
                      {reportScore >= 80 ? 'Mükemmel' : reportScore >= 50 ? 'İyi / Geliştirilebilir' : 'Kritik / Dikkat Edilmeli'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                    Bu skor, harcama sıklığınız, kategori dengeniz ve belirlediğiniz bütçe limitlerine uyum durumunuza göre otomatik hesaplanmıştır.
                  </p>
                </div>
              </div>

              {/* Rapor Metni (Markdown formatında) */}
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/30 p-5 border border-slate-850 rounded-2xl max-h-[300px] overflow-y-auto space-y-3 font-medium">
                {cleanReportText(reportText)}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-850 p-5 flex items-center justify-end bg-slate-950">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                Anlaşıldı
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- FİŞ LİGHTROOM MÜFETTİŞİ MODALI (Premium Lightbox Modal) --- */}
      {inspectorExpense && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 border-b border-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600/10 border border-indigo-500/20 p-2 rounded-xl">
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Fiş & Fatura Denetim İstasyonu</h3>
                  <p className="text-[10px] text-slate-500">Orijinal görseli denetleyin ve finansal okumaları analiz edin</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setInspectorExpense(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Çift Bölmeli Bölüm */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              
              {/* Sol Panel: Resim Gösterici (Lightroom Canvas) */}
              <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center border-r border-slate-850/80 group/canvas select-none">
                
                {/* Resim Container */}
                <div className="w-full h-full flex items-center justify-center overflow-hidden p-6 relative">
                  <img 
                    src={inspectorExpense.receiptImageUrl || ''} 
                    alt={inspectorExpense.storeName}
                    style={{
                      transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl origin-center"
                    draggable="false"
                  />
                </div>

                {/* Gelişmiş Resim Kontrolleri Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl p-2 rounded-2xl shadow-xl z-20 transition-all">
                  <button
                    onClick={() => setImageZoom(prev => Math.min(prev + 0.25, 3))}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition active:scale-90"
                    title="Yakınlaştır"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setImageZoom(prev => Math.max(prev - 0.25, 0.5))}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition active:scale-90"
                    title="Uzaklaştır"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setImageRotation(prev => (prev + 90) % 360)}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition active:scale-90"
                    title="90° Döndür"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setImageZoom(1); setImageRotation(0); }}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition active:scale-90 border-l border-slate-800 pl-3.5"
                    title="Sıfırla"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sağ Panel: Finansal Veri Müfettişi */}
              <div className="w-full md:w-[380px] bg-slate-900/50 p-6 flex flex-col overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                
                {/* Temel Bilgiler Grid */}
                <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span 
                      style={getCategoryBadgeStyle(inspectorExpense.category)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold"
                    >
                      <Tag className="h-2.5 w-2.5 shrink-0" />
                      {inspectorExpense.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {new Date(inspectorExpense.expenseDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">İşletme / Kaynak</span>
                    <h4 className="text-base font-extrabold text-white mt-1">{inspectorExpense.storeName}</h4>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-900 pt-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Toplam Tutar</span>
                      <span className="text-xl font-extrabold text-white mt-1 block tabular-nums">
                        ₺{inspectorExpense.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Fiş Tipi Badge */}
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg ${
                      inspectorExpense.type === 'Gelir' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {inspectorExpense.type === 'Gelir' ? '🟢 Gelir' : '🔴 Gider'}
                    </span>
                  </div>
                </div>

                {/* Ürün Kalemleri Listesi */}
                <div className="flex-1 flex flex-col min-h-[180px]">
                  <h4 className="text-xxs font-extrabold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 shrink-0">
                    🛒 Ürün Kalemleri ({inspectorExpense.items?.length || 0})
                  </h4>
                  
                  {(!inspectorExpense.items || inspectorExpense.items.length === 0) ? (
                    <div className="flex-1 bg-slate-950/20 border border-dashed border-slate-850 rounded-2xl flex items-center justify-center p-5 text-center">
                      <p className="text-xs text-slate-600 italic">Bu fişte detaylı ürün/satır kalemi algılanamadı.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 overflow-y-auto pr-1">
                      {inspectorExpense.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-850 rounded-xl hover:border-slate-800 transition">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-extrabold text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg shrink-0">
                              x{item.quantity}
                            </span>
                            <span className="text-xs font-bold text-slate-200 truncate" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-white tabular-nums pl-2 shrink-0">
                            ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Akıllı Yeniden Çözümleme İstasyonu */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-3.5 shrink-0">
                  <div>
                    <h5 className="text-[11px] font-extrabold text-slate-300">Yapay Zekalı OCR İstasyonu</h5>
                    <p className="text-[10px] text-slate-500 mt-1">Eğer fiş verilerinde okuma hatası varsa, diskteki resmi Gemini ile sıfırdan tekrar tarayalım.</p>
                  </div>
                  
                  <button
                    onClick={() => handleReanalyzeReceipt(inspectorExpense.id)}
                    disabled={reanalyzingId !== null}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-850 disabled:to-slate-900 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition duration-300 active:scale-95 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {reanalyzingId === inspectorExpense.id ? (
                      <>
                        <span className="w-4 h-4 border-2 border-indigo-400 border-t-white rounded-full animate-spin"></span>
                        <span>Yeniden Analiz Ediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                        <span>Yapay Zeka ile Yeniden Çözümle</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-850 p-4 flex items-center justify-end bg-slate-950 shrink-0">
              <button
                type="button"
                onClick={() => setInspectorExpense(null)}
                className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
