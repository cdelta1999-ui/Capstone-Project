import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer, LayoutDashboard, FileText } from "lucide-react";

export default function Nav() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-indigo-500/10 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              S
            </div>
            Salifort Motors
          </div>
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                location === "/dashboard"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/insights"
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                location === "/insights"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <FileText className="h-4 w-4" />
              Insight Report
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {location === "/insights" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="hidden md:flex gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
