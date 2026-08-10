import FileUploader from "../../components/FileUploader/FileUploader";
import ProgressBar from "../../components/ProgressBar/ProgressBar";

function Dashboard() {
  return (
    <main className="dashboard">
      <h1>StreamWeaver</h1>
      <p>High-throughput no-code ETL pipeline</p>

      <FileUploader />
      <ProgressBar progress={0} />
    </main>
  );
}

export default Dashboard;
