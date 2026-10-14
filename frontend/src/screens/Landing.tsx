type Props = { onStart: () => void };

// Главный визуальный ход: «страница» с выделенными маркером строками и ответом на полях —
// ровно то, что делает RAG: находит фрагмент и отвечает по нему со ссылкой на страницу.
function Landing({ onStart }: Props) {
  return (
    <main className="landing">
      <section className="landing-text">
        <h1>Smart RAG Application</h1>
        <p className="lead">
          Upload a PDF or text file and chat with it. Every answer comes from the passages the assistant finds in your
          document, with page numbers, and it tells you when the document has no answer.
        </p>
        <button type="button" className="primary" onClick={onStart}>
          Start
        </button>
        <p className="fine-print">
          Demo on free GPU hardware. The first request after a quiet period can take a few minutes while the server
          wakes up.
        </p>
      </section>

      <figure className="specimen" aria-label="Example: an answer linked to a highlighted passage">
        <div className="specimen-page">
          <span className="specimen-folio">2</span>
          <p>
            Returns and refunds. <mark>We accept returns within 14 days of delivery if the item has not been used
            and its packaging and labels are intact.</mark> Refunds are sent to the original payment method within
            five business days after the item arrives at our warehouse.
          </p>
        </div>
        <figcaption className="specimen-note">
          <span className="specimen-q">Can I return an item after three weeks?</span>
          <span className="specimen-a">No. Returns are accepted within 14 days of delivery (p. 2).</span>
        </figcaption>
      </figure>
    </main>
  );
}

export default Landing;
