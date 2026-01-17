'use client';

import { Button } from '@/components/ui/button';

export default function DesignSystemPage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-editorial text-4xl text-ink mb-8">CareCircle Design System</h1>

      {/* Sage Scale */}
      <section className="mb-12">
        <h2 className="font-editorial text-2xl text-ink mb-4">Sage Color Scale</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
            <div key={shade} className="space-y-2">
              <div
                className={`h-24 rounded-lg border border-border shadow-sm bg-sage-${shade}`}
              />
              <p className="text-sm font-semibold text-ink">sage-{shade}</p>
              <p className={`text-xs text-sage-${shade === 50 || shade === 100 ? 800 : shade}`}>
                Sample text
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Colors */}
      <section className="mb-12">
        <h2 className="font-editorial text-2xl text-ink mb-4">Core Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-24 rounded-lg border border-border shadow-sm bg-sage" />
            <p className="text-sm font-semibold text-ink">Sage</p>
            <p className="text-xs text-sage">#525E48</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-lg border border-border shadow-sm bg-sage-light" />
            <p className="text-sm font-semibold text-ink">Sage Light</p>
            <p className="text-xs text-sage-light">#8B9A7E</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-lg border border-border shadow-sm bg-terracotta" />
            <p className="text-sm font-semibold text-ink">Terracotta</p>
            <p className="text-xs text-terracotta">#996B4D</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-lg border border-border shadow-sm bg-slate" />
            <p className="text-sm font-semibold text-ink">Slate</p>
            <p className="text-xs text-slate">#4A5F70</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-lg border border-border shadow-sm bg-cream" />
            <p className="text-sm font-semibold text-ink">Cream</p>
            <p className="text-xs text-warm-gray">#F9F6F1</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-lg border border-border shadow-sm bg-stone" />
            <p className="text-sm font-semibold text-ink">Stone</p>
            <p className="text-xs text-warm-gray">#EDEBE6</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-lg border border-border shadow-sm bg-ink" />
            <p className="text-sm font-semibold text-ink">Ink</p>
            <p className="text-xs text-cream">#1E1E1E</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-lg border border-border shadow-sm bg-background" />
            <p className="text-sm font-semibold text-ink">Background</p>
            <p className="text-xs text-warm-gray">Warm Cream</p>
          </div>
        </div>
      </section>

      {/* Button Variants */}
      <section className="mb-12">
        <h2 className="font-editorial text-2xl text-ink mb-4">Button Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default (Sage)</Button>
          <Button variant="sage">Sage</Button>
          <Button variant="sage-light">Sage Light</Button>
          <Button variant="secondary">Secondary (Terracotta)</Button>
          <Button variant="terracotta">Terracotta</Button>
          <Button variant="slate">Slate</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="editorial">Editorial</Button>
          <Button variant="editorial-outline">Editorial Outline</Button>
        </div>
      </section>

      {/* Button Sizes */}
      <section className="mb-12">
        <h2 className="font-editorial text-2xl text-ink mb-4">Button Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra Large</Button>
        </div>
      </section>

      {/* Typography */}
      <section className="mb-12">
        <h2 className="font-editorial text-2xl text-ink mb-4">Typography</h2>
        <div className="space-y-4">
          <div>
            <h1 className="font-editorial text-4xl text-ink">Heading 1 - Libre Baskerville</h1>
            <p className="text-xs text-warm-gray">font-editorial text-4xl</p>
          </div>
          <div>
            <h2 className="font-editorial text-3xl text-ink">Heading 2 - Libre Baskerville</h2>
            <p className="text-xs text-warm-gray">font-editorial text-3xl</p>
          </div>
          <div>
            <h3 className="font-editorial text-2xl text-ink">Heading 3 - Libre Baskerville</h3>
            <p className="text-xs text-warm-gray">font-editorial text-2xl</p>
          </div>
          <div>
            <h4 className="font-editorial text-xl text-ink">Heading 4 - Libre Baskerville</h4>
            <p className="text-xs text-warm-gray">font-editorial text-xl</p>
          </div>
          <div>
            <p className="font-body text-base text-ink">
              Body text - Source Sans 3. The quick brown fox jumps over the lazy dog.
            </p>
            <p className="text-xs text-warm-gray">font-body text-base</p>
          </div>
          <div>
            <p className="font-body text-sm text-warm-gray">
              Secondary text - Source Sans 3. The quick brown fox jumps over the lazy dog.
            </p>
            <p className="text-xs text-warm-gray">font-body text-sm text-warm-gray</p>
          </div>
          <div>
            <p className="label-caps text-sage-700">Label Caps - All Caps Typography</p>
            <p className="text-xs text-warm-gray">label-caps</p>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="mb-12">
        <h2 className="font-editorial text-2xl text-ink mb-4">Card Components</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="dashboard-card">
            <h3 className="font-editorial text-lg text-ink mb-2">Dashboard Card</h3>
            <p className="text-sm text-warm-gray">Standard card with subtle shadow</p>
          </div>
          <div className="care-card rounded-xl">
            <h3 className="font-editorial text-lg text-ink mb-2">Care Card</h3>
            <p className="text-sm text-warm-gray">Card for care-related content</p>
          </div>
          <div className="loved-one-card rounded-xl p-6">
            <h3 className="font-editorial text-lg text-ink mb-2">Loved One Card</h3>
            <p className="text-sm text-warm-gray">Special card for care recipients</p>
          </div>
        </div>
      </section>

      {/* Borders */}
      <section className="mb-12">
        <h2 className="font-editorial text-2xl text-ink mb-4">Borders</h2>
        <div className="space-y-4">
          <div className="p-4 border border-sage-200 rounded-lg bg-card">
            <p className="text-sm text-ink">border-sage-200 - Light border</p>
          </div>
          <div className="p-4 border border-sage-300 rounded-lg bg-card">
            <p className="text-sm text-ink">border-sage-300 - Muted border</p>
          </div>
          <div className="p-4 border-2 border-sage-700 rounded-lg bg-card">
            <p className="text-sm text-ink">border-2 border-sage-700 - Primary border</p>
          </div>
          <div className="p-4 border border-terracotta rounded-lg bg-card">
            <p className="text-sm text-ink">border-terracotta - Warm accent border</p>
          </div>
        </div>
      </section>
    </div>
  );
}
