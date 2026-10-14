export interface BlogFaq {
  question: string;
  answer: string;
}

export const DEFAULT_BLOG_FAQS: BlogFaq[] = [
  {
    question: 'How do I start investing in the stock market?',
    answer:
      'Start by learning the basics, setting a budget and understanding the risks involved. You can explore educational resources, company reports and reliable financial websites. Pristine Gaze also provides stock market research and educational content to help beginners build their knowledge.',
  },
  {
    question: 'How do I know which ASX stocks to buy?',
    answer:
      "Choosing stocks requires more than following market trends or tips. Investors should examine a company's business model, revenue, profitability, debt, valuation, growth prospects and potential risks. Comparing information from multiple reliable sources can help you develop a more informed view. Pristine Gaze provides equity research and company analysis to support your independent investment decisions.",
  },
  {
    question: 'Is it better to invest in growth stocks or dividend stocks?',
    answer:
      'It depends on your financial goals, investment horizon and tolerance for risk. Growth stocks may appeal to investors seeking potential capital appreciation, while dividend stocks may suit those interested in income. Neither approach guarantees returns. Pristine Gaze offers Emerging Growth Opportunities research and a Dividend Yield Report to help investors explore both strategies.',
  },
  {
    question: 'What are the best ASX stocks to invest in?',
    answer:
      'There is no single best stock for every investor. Consider company performance, valuation, industry trends and your investment goals before making a decision. Pristine Gaze researches selected ASX-listed companies to help investors understand their business performance and potential opportunities.',
  },
  {
    question: 'Is it a good time to invest in stocks?',
    answer:
      'It depends on your financial goals, investment timeframe and risk tolerance. Before investing, understand the market conditions and research the company you are considering. Pristine Gaze provides stock research and market insights to help investors evaluate opportunities and make informed decisions.',
  },
];

export function getActiveFaqs(faqs?: BlogFaq[] | null): BlogFaq[] {
  if (Array.isArray(faqs)) {
    const cleaned = faqs
      .filter((f) => f && typeof f.question === 'string' && f.question.trim().length > 0)
      .map((f) => ({
        question: f.question.trim(),
        answer: (f.answer || '').trim(),
      }));
    if (cleaned.length > 0) return cleaned;
  }
  return DEFAULT_BLOG_FAQS;
}

