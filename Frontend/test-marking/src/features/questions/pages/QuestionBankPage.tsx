import { Navigate, useParams } from "react-router";

export function QuestionBankPage() {
  const { id } = useParams();
  return <Navigate to={`/exams/${id}/edit?step=4`} replace />;
}
