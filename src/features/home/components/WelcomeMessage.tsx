import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

const WelcomeMessage = ({
  name,
  signOut,
}: {
  name: string;
  signOut: () => void;
}) => {
  return (
    <>
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
        Welcome <span className="text-[hsl(280,100%,70%)]">{name}</span>!
      </h1>
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-4">
          <Link href="/sse-demo">
            <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              SSE Demo
            </Button>
          </Link>
          <Link href="/reels/upload">
            <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Upload Reels
            </Button>
          </Link>
        </div>
        <Button onClick={signOut}>{"Sign out"}</Button>
      </div>
    </>
  );
};

export default WelcomeMessage;
