import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { type NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";

import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { PostView } from "../components/postview";


//TODO: you can use the same validator for emojis in the frontend and backend to validate on client side
//TODO: You might also want to sync your database with clerk
//TODO: Add OG image support 
const CreatePostWizard = () => {
  //const { isSignedIn, user, isLoaded } = useUser();
  const { user } = useUser();
  const [input, setInput] = useState("");

  const ctx = api.useContext();

  const { mutate, isLoading: isPosting } = api.posts.create.useMutation({
    onSuccess: () => {
      setInput("");
      void ctx.posts.getAll.invalidate();
    },
    onError: (err) => {
      const errorMessage = err.data?.zodError?.fieldErrors?.content;

      if (errorMessage && errorMessage[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to post! Please try again later.");
      }
    },
  });

  if (!user) return null;
  // TODO: replace this with react-hook-form
  return (
    <div className="flex gap-3">
      <Head>
        <title>Home</title>
      </Head>
      <Image
        className="h-14 w-14 rounded-full"
        src={user.profileImageUrl}
        alt="Profile Image"
        width="56"
        height="56"
      />
      <input
        className="grow bg-transparent outline-none"
        placeholder="Type some emojis!"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        // submit on enter
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            mutate({ content: input });
          }
        }}
        disabled={isPosting}
      />
      {input !== "" && !isPosting && (
        <button onClick={() => mutate({ content: input })}>Post</button>
      )}
      {isPosting && (
        <div className="flex items-center justify-center">
          <LoadingSpinner size={20} />
        </div>
      )}
    </div>
  );
};

const Feed = () => {
  const { data, isLoading: postLoading } = api.posts.getAll.useQuery();

  if (postLoading) return <LoadingPage />;

  if (!data) {
    return <div>Something went wrong</div>;
  }

  return (
    <article className="flex flex-col">
      {data.map(({ post, author }) => (
        <PostView key={post.id} post={post} author={author} />
      ))}
    </article>
  );
};

const Home: NextPage = () => {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();

  // Start fetching asap (caching)
  api.posts.getAll.useQuery();

  // Return empty div if user isn't loaded
  if (!userLoaded) return <div />;

  return (
    <>
      <Head>
        <title>Chirp</title>
        <meta name="description" content="💬" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <div className="border-b border-slate-400 p-4">
          {/* <main className="flex h-screen justify-center">
        <div className="h-full w-full border-x border-slate-400 md:max-w-2xl">
          <div className="border-b border-slate-400 p-4"> */}
          {!isSignedIn && (
            <div className="flex justify-center">
              <SignInButton mode="modal">
                <button>Sign in</button>
              </SignInButton>
            </div>
          )}
          {!!isSignedIn && (
            <div className="">
              <CreatePostWizard />
              {/* <div className="flex justify-center">
                <SignOutButton>
                  <button>Sign out</button>
                </SignOutButton>
              </div> */}
            </div>
          )}
        </div>
        <Feed />
      </PageLayout>
    </>
  );
};

export default Home;
