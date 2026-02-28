import Home from "./Home";

interface IndexProps {
  currentUserId: string | null;
}

const Index = ({ currentUserId }: IndexProps) => {
  return <Home currentUserId={currentUserId!} />;
};

export default Index;
