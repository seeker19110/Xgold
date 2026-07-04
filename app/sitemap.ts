// SEO: sitemap.xml sinh tự động (GĐ 7). Route chart sinh từ registry mã để mã mới tự có mặt.
import type { MetadataRoute } from 'next';
import { INSTRUMENTS } from '@/lib/instruments';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...INSTRUMENTS.map((instrument) => ({
      url: `${siteUrl}/chart/${instrument.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    {
      url: `${siteUrl}/gia-vang-trong-nuoc`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
  ];
}
