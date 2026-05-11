/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback, ReactNode } from "react";
import { 
  CreditCard, 
  Truck, 
  FileText, 
  BarChart3, 
  Settings, 
  Users, 
  Box, 
  Search, 
  Bell, 
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types for EasyPost Embeddables
interface FontConfig {
  cssSrc?: string;
  family?: string;
  src?: string;
  style?: string;
  weight?: string;
}

interface AppearanceConfig {
  tokens?: Record<string, { value: string } | string>;
  modalZIndex?: string;
}

interface InitOptions {
  fetchSessionId: () => Promise<string | null>;
  fonts?: FontConfig[];
  appearance?: AppearanceConfig;
}

interface EmbeddablesInstance {
  open: (componentType: string) => Promise<void>;
  on: (eventType: string, handler: (event: any) => void) => void;
  off: (eventType: string, handler: (event: any) => void) => void;
  update: (options: { fonts?: FontConfig[]; appearance?: any }) => Promise<void>;
  destroy: () => void;
}

interface EasyPostEmbeddablesGlobal {
  onLoad?: () => void;
  init: (options: InitOptions) => EmbeddablesInstance;
}

declare global {
  interface Window {
    EasyPostEmbeddables: EasyPostEmbeddablesGlobal;
  }
}

export default function App() {
  const [embeddables, setEmbeddables] = useState<EmbeddablesInstance | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const fetchSessionId = useCallback(async () => {
    try {
      const response = await fetch("/api/easypost-embeddables/session");
      const data = await response.json();
      
      if (data.success === false) {
        // Handle EasyPost specific error format
        const message = data.error?.message || (typeof data.error === 'string' ? data.error : "Failed to fetch session ID");
        const statusPrefix = data.status ? `[Status ${data.status}] ` : "";
        throw new Error(`${statusPrefix}${message}`);
      }
      
      if (!data.session_id) {
        throw new Error("API returned success but no session_id was found.");
      }
      
      return data.session_id;
    } catch (err: any) {
      console.error("[EasyPost] Session ID fetch failed:", err);
      setError(err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    const handleOnLoad = () => {
      console.log("[EasyPost] SDK Loaded");
      const instance = window.EasyPostEmbeddables.init({
        fetchSessionId,
        fonts: [
          {
            cssSrc: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
          },
        ],
        appearance: {
          tokens: {
            "font.family": "Poppins, sans-serif",
            "color.primary.500": { value: "#164DFF" }, // EasyPost Blue
          },
          modalZIndex: "1000",
        },
      });
      setEmbeddables(instance);
      setIsLoaded(true);
    };

    if (window.EasyPostEmbeddables?.init) {
      handleOnLoad();
    } else {
      // Cast to any to bypass the initial empty object check during script loading
      (window as any).EasyPostEmbeddables = window.EasyPostEmbeddables || {};
      window.EasyPostEmbeddables.onLoad = handleOnLoad;
    }
  }, [fetchSessionId]);

  const handleOpenComponent = async (type: string) => {
    if (!embeddables) {
      setError("EasyPost SDK is not initialized yet.");
      return;
    }
    try {
      setError(null);
      await embeddables.open(type);
    } catch (err: any) {
      console.error(`[EasyPost] Failed to open ${type}:`, err);
      setError(`Failed to open component: ${err.message}`);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-neutral-200 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
            <Box size={20} />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Forge Demo</span>
        </div>
        
        <nav className="p-4 flex-1 space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")} 
          />
          <NavItem 
            icon={<Users size={18} />} 
            label="Sub-accounts" 
            active={activeTab === "accounts"} 
            onClick={() => setActiveTab("accounts")} 
          />
          <NavItem 
            icon={<ShieldCheck size={18} />} 
            label="Integrations" 
            active={activeTab === "integrations"} 
            onClick={() => setActiveTab("integrations")} 
          />
          <div className="pt-4 pb-2 px-3 text-[10px] font-mono text-neutral-400 uppercase tracking-widest">EasyPost Components</div>
          <NavItem 
            icon={<CreditCard size={18} />} 
            label="Billing" 
            onClick={() => handleOpenComponent("manage-billing")} 
          />
          <NavItem 
            icon={<Truck size={18} />} 
            label="Carriers" 
            onClick={() => handleOpenComponent("manage-carriers")} 
          />
          <NavItem 
            icon={<FileText size={18} />} 
            label="Payment Logs" 
            onClick={() => handleOpenComponent("manage-payment-logs")} 
          />
          <NavItem 
            icon={<BarChart3 size={18} />} 
            label="Reports" 
            onClick={() => handleOpenComponent("manage-reports")} 
          />
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden">
              <img src="https://api.dicebear.com/7.x/initials/svg?seed=EP" alt="User" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium truncate">Demo Platform</p>
              <p className="text-[10px] font-mono text-neutral-400 truncate">EP-ORG-12345</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-neutral-50 overflow-auto">
        <header className="bg-white border-b border-neutral-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input 
                type="text" 
                placeholder="Search shipments, labels or users..." 
                className="w-full pl-10 pr-4 py-1.5 bg-neutral-100 border-none rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors">
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
          <div>
            <h1 className="text-3xl">Platform Overview</h1>
            <p className="text-neutral-500 mt-1">Manage your logistical ecosystem and sub-account integrations.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 shadow-sm"
            >
              <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-lg">Action Required: Configuration Found</h3>
                <p className="text-sm opacity-90 mt-1">{error}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="text-[10px] bg-white/50 px-2 py-1 rounded border border-amber-200 font-mono">1. Open Settings (top right)</div>
                  <div className="text-[10px] bg-white/50 px-2 py-1 rounded border border-amber-200 font-mono">2. Navigate to Secrets</div>
                  <div className="text-[10px] bg-white/50 px-2 py-1 rounded border border-amber-200 font-mono">3. Add EASYPOST_API_KEY (EZPT...)</div>
                  <div className="text-[10px] bg-white/50 px-2 py-1 rounded border border-amber-200 font-mono">4. Add EASYPOST_SUB_ACCOUNT_ID (user_...)</div>
                </div>
              </div>
              <button 
                onClick={() => setError(null)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors uppercase tracking-wider md:ml-auto"
              >
                Got it
              </button>
            </motion.div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Shipments" value="12,482" trend="+12.5%" trendType="positive" />
            <StatCard label="Active Sub-accounts" value="48" trend="+2" trendType="positive" />
            <StatCard label="Pending Disputes" value="3" trend="-1" trendType="neutral" />
            <StatCard label="Monthly Spend" value="$8,241" trend="+4.2%" trendType="negative" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Embeddable Triggers */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl">Embeddable Components</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ComponentTrigger 
                  type="manage-billing" 
                  title="Billing & Payments" 
                  description="Configure payment methods, view invoices, and manage wallet balance for sub-accounts."
                  icon={<CreditCard className="text-blue-600" />}
                  onClick={() => handleOpenComponent("manage-billing")}
                />
                <ComponentTrigger 
                  type="manage-carriers" 
                  title="Carrier Management" 
                  description="Add credentials for UPS, FedEx, USPS and 100+ other carriers directly."
                  icon={<Truck className="text-purple-600" />}
                  onClick={() => handleOpenComponent("manage-carriers")}
                />
                <ComponentTrigger 
                  type="manage-payment-logs" 
                  title="Payment Logs" 
                  description="Audit every transaction and payment event recorded across the sub-account lifecycle."
                  icon={<FileText className="text-amber-600" />}
                  onClick={() => handleOpenComponent("manage-payment-logs")}
                />
                <ComponentTrigger 
                  type="manage-reports" 
                  title="Detailed Reporting" 
                  description="Generate shipments, insurance, or tracker reports to gain insights into operations."
                  icon={<BarChart3 className="text-emerald-600" />}
                  onClick={() => handleOpenComponent("manage-reports")}
                />
              </div>

              {/* Data Grid Mockup */}
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm mt-8">
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                  <h3 className="font-display font-semibold">Recent Sub-account Activity</h3>
                  <button className="text-xs font-mono text-neutral-400 hover:text-blue-600 transition-colors flex items-center gap-1">
                    View all <ChevronRight size={14} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="p-4 font-mono text-[10px] text-neutral-400 uppercase tracking-widest pl-6">Entity</th>
                        <th className="p-4 font-mono text-[10px] text-neutral-400 uppercase tracking-widest">ID</th>
                        <th className="p-4 font-mono text-[10px] text-neutral-400 uppercase tracking-widest">Status</th>
                        <th className="p-4 font-mono text-[10px] text-neutral-400 uppercase tracking-widest text-right pr-6">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      <Row name="Greenhouse Logistics" id="EP-SA-001" status="Active" time="2m ago" />
                      <Row name="Velvet Apparel" id="EP-SA-482" status="Pending Billing" time="45m ago" />
                      <Row name="Neon Tech Store" id="EP-SA-912" status="Active" time="1h ago" />
                      <Row name="Old Brewery" id="EP-SA-203" status="Inactive" time="3d ago" />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar / Info */}
            <div className="space-y-6">
              <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-lg font-display mb-2">Forge Documentation</h3>
                  <p className="text-blue-100 text-sm mb-4 leading-relaxed">
                    Embeddable components allow you to outsource the complex logic of carrier setup and billing to EasyPost.
                  </p>
                  <button className="bg-white text-blue-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors uppercase tracking-wider">
                    Read Guide
                  </button>
                </div>
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-24 h-24 bg-black/10 rounded-full blur-2xl"></div>
              </div>

              <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm">
                <h3 className="font-display font-semibold mb-4">Integration Health</h3>
                <div className="space-y-4">
                  <HealthMetric label="API Gateway" status="operational" />
                  <HealthMetric label="Embeddable Service" status="operational" />
                  <HealthMetric label="Carrier Handlers" status="operational" />
                  <HealthMetric label="Stripe Connect" status="operational" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Initialize state Overlay */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-center"
          >
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full space-y-4">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <h2 className="text-xl font-display">Initializing Forge...</h2>
              <p className="text-neutral-500 text-sm">Please wait while we establish a secure session with EasyPost.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
        active 
          ? "bg-blue-50 text-blue-600 font-medium" 
          : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && <motion.div layoutId="active" className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />}
    </button>
  );
}

function StatCard({ label, value, trend, trendType }: { label: string, value: string, trend: string, trendType: "positive" | "negative" | "neutral" }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-display font-bold">{value}</h3>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
          trendType === "positive" ? "bg-emerald-50 text-emerald-600" :
          trendType === "negative" ? "bg-red-50 text-red-600" :
          "bg-blue-50 text-blue-600"
        }`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function ComponentTrigger({ title, description, icon, onClick, type }: { title: string, description: string, icon: ReactNode, onClick: () => void, type: string }) {
  return (
    <button 
      onClick={onClick}
      className="group p-5 bg-white border border-neutral-200 rounded-xl text-left hover:border-blue-500 hover:ring-4 hover:ring-blue-50 backdrop-blur-sm transition-all shadow-sm flex flex-col h-full overflow-hidden relative"
    >
      <div className="p-3 bg-neutral-50 rounded-lg w-fit group-hover:bg-blue-50 transition-colors mb-4">
        {icon}
      </div>
      <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
        {title}
        <motion.span 
          initial={{ x: -4, opacity: 0 }}
          whileHover={{ x: 0, opacity: 1 }}
          className="text-blue-600 text-xs flex items-center"
        >
          OPEN <ChevronRight size={14} />
        </motion.span>
      </h3>
      <p className="text-xs text-neutral-500 leading-relaxed flex-1">{description}</p>
      
      {/* Visual tag for dev awareness */}
      <div className="mt-4 pt-4 border-t border-dotted border-neutral-100 flex items-center justify-between">
        <span className="text-[10px] font-mono text-neutral-300 uppercase letter-spacing-widest group-hover:text-blue-300">EP-COMPONENT</span>
        <div className="w-1.5 h-1.5 rounded-full bg-neutral-200 group-hover:bg-blue-400"></div>
      </div>
    </button>
  );
}

function Row({ name, id, status, time }: { name: string, id: string, status: string, time: string }) {
  return (
    <tr className="hover:bg-neutral-50 transition-colors group">
      <td className="p-4 pl-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-400 group-hover:bg-white transition-colors border border-transparent group-hover:border-neutral-200">
            {name.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{name}</span>
        </div>
      </td>
      <td className="p-4">
        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">{id}</span>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            status === "Active" ? "bg-emerald-500" :
            status === "Inactive" ? "bg-neutral-300" :
            "bg-amber-500"
          }`}></div>
          <span className="text-xs text-neutral-600">{status}</span>
        </div>
      </td>
      <td className="p-4 pr-6 text-right text-xs text-neutral-400 font-mono italic">{time}</td>
    </tr>
  );
}

function HealthMetric({ label, status }: { label: string, status: "operational" | "degraded" | "down" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 font-bold">Operational</span>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
      </div>
    </div>
  );
}
