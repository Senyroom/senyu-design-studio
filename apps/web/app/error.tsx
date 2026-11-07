'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>内容暂时没有加载完成</h1>
      <p>稍后重试，继续探索。</p>
      <button className="primary-button" onClick={reset}>
        重新加载
      </button>
    </main>
  );
}
