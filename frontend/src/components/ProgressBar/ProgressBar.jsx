function ProgressBar({ progress = 0 }) {
  return (
    <section>
      <h2>Processing Progress</h2>
      <progress value={progress} max="100" />
      <span>{progress}%</span>
    </section>
  );
}

export default ProgressBar;
