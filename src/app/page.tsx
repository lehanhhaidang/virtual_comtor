import { Languages, Mic, FileText, Users } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Languages className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">
              Virtual Comtor
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Đăng ký
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-vietnamese" />
            Real-time Translation
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Dịch thuật{' '}
            <span className="text-japanese">日本語</span>
            {' ↔ '}
            <span className="text-vietnamese">Tiếng Việt</span>
            <br />
            trong thời gian thực
          </h1>

          <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
            Phiên dịch AI cho cuộc họp giữa khách hàng Nhật và đội ngũ Việt Nam.
            <br />
            Tự động nhận diện người nói, dịch song song, ghi âm toàn bộ.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mic className="h-5 w-5" />
              Bắt đầu ngay
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Đã có tài khoản? Đăng nhập
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Mic className="h-6 w-6 text-japanese" />}
            title="Real-time STT"
            description="Nhận diện giọng nói Nhật & Việt với AI Soniox, dịch ngay lập tức."
          />
          <FeatureCard
            icon={<Users className="h-6 w-6 text-customer" />}
            title="Phân biệt người nói"
            description="Tự động nhận diện Customer 1, 2, 3 và Our 1, 2, 3 theo giọng."
          />
          <FeatureCard
            icon={<FileText className="h-6 w-6 text-vietnamese" />}
            title="Export transcript"
            description="Ghi âm, lưu transcript, export CSV/XLSX để review sau cuộc họp."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Virtual Comtor — Powered by Soniox AI
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/30">
      <div className="mb-3">{icon}</div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
