import Link from "next/link";
import Image from "next/image";
import { Github } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10" style={{ backgroundColor: '#020918' }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image
              src="/logo-payzed.png"
              alt="PayZed Logo"
              width={120}
              height={40}
              className="h-8 w-auto"
              priority
              unoptimized
            />
          </Link>
          
          <p className="text-sm text-muted-foreground text-center">
            © {currentYear} PayZed. All rights reserved.
          </p>
          
          <Link
            href="https://github.com/ronaldo-aquino/PayZed"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
            <span className="text-sm">GitHub</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

