import { useParams, useSearchParams } from "react-router";
import { CreateExamMultiStep } from "./CreateExamMultiStep";

export function ExamFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const step = Number(searchParams.get("step"));
  const initialStep = step >= 1 && step <= 4 ? step : undefined;
  return <CreateExamMultiStep examId={id} initialStep={initialStep} />;
}
