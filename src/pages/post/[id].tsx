import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { type NextPage } from "next";
import Head from "next/head";
import { LoadingSpinner } from "~/components/loading";
import { api } from "~/utils/api";

// POST VIEW
const PostView: NextPage = () => {
  const { data, isLoading } = api.posts.getOne.useQuery({
    id: "clj9d9n4f0000on6l5oiwdp3z",
  });

  if (isLoading) {
    console.log("loading");
    return (
      <div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return <div>404</div>;
  }

  return (
    <>
      <Head>
        <title>Post</title>
      </Head>
      <main className="flex h-screen justify-center">
        <div>Post View</div>
        <div>{data.content}</div>
      </main>
    </>
  );
};

export default PostView;
