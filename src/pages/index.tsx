import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { type NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";

import Image from "next/image";
import {
  FullLoadingPage,
  LoadingFeed,
  LoadingSpinner,
} from "~/components/loading";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { PageLayout } from "~/components/layout";
import { PostView } from "../components/postview";
import Link from "next/link";
import { type SubmitHandler, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { inputSchema, type inputSchemaType } from "~/utils/validation";


//TODO: You might also want to sync your database with clerk
//TODO: Add OG image support

const CreatePostWizard = () => {
  const { user } = useUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<inputSchemaType>({
    resolver: zodResolver(inputSchema),
  });

  const ctx = api.useContext();

  const { mutate, isLoading: isPosting } = api.posts.create.useMutation({
    onSuccess: () => {
      void ctx.posts.getBatch.invalidate();
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
  if (!user.username) return null;
  if (!user.profileImageUrl) return null;

  const onSubmit: SubmitHandler<inputSchemaType> = (data) => {
    mutate({ content: data.content });
    reset();
  };

  return (
    <>
      <Head>
        <title>Home</title>
      </Head>
      <div className="flex items-center gap-1 sm:gap-2">
        <Link href={`/@${user.username}`} className="flex-shrink-0">
          <Image
            className="h-12 w-12 rounded-full"
            src={user.profileImageUrl}
            alt={`@${user.username}'s profile picture`}
            width="48"
            height="48"
          />
        </Link>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)().catch((err) => {
              console.error(err);
            });
          }}
          className="flex grow gap-1 overflow-clip"
        >
          <div className="flex grow flex-col overflow-clip">
            <input
              className="mt-3 rounded-full bg-transparent px-1 outline-none"
              id="content"
              placeholder="Type some emojis!"
              {...register("content")}
            />
            <p
              className={`overflow-clip overflow-ellipsis text-xs italic text-red-500 +${
                errors.content ? "invisible" : ""
              }`}
            >
              {errors.content ? errors.content.message : <span>&nbsp;</span>}
            </p>
          </div>

          {!isPosting && (
            <button
              type="submit"
              className="mt-2 h-10 rounded-full bg-blue-600 px-2 text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:font-semibold"
            >
              Tweet
            </button>
          )}
          <div className="flex items-center">
            {isPosting && (
              <div className="mr-8 flex items-center justify-center">
                <LoadingSpinner size={20} />
              </div>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

const useScrollPosition = (
  scrollPosition: number,
  setScrollPosition: Dispatch<SetStateAction<number>>
) => {
  const handleScroll = () => {
    //TODO: use debounce to prevent too many rerenders, and see if you can move the state inside the hook
    //const position = window.scrollY;
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;
    const scrolled = (winScroll / height) * 100;

    setScrollPosition(scrolled);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return scrollPosition;
};

const Feed = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const {
    data,
    isLoading: postLoading,
    hasNextPage,
    fetchNextPage,
    isFetching,
  } = api.posts.getBatch.useInfiniteQuery(
    {
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // initialCursor: 1, // <-- optional you can pass an initialCursor
    }
  );

  const scrollPositionOutput = useScrollPosition(
    scrollPosition,
    setScrollPosition
  );

  useEffect(() => {
    if (scrollPositionOutput > 90 && hasNextPage && !isFetching && !isLocked) {
      setIsLocked(true);
      setScrollPosition(0);
      fetchNextPage()
        .then(() => {
          setIsLocked(false);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [scrollPositionOutput, fetchNextPage, hasNextPage, isFetching, isLocked]);

  if (postLoading) return <LoadingFeed />;

  if (!data) {
    return <div>Something went wrong.</div>;
  }

  const posts = data.pages.flatMap((page) => page.postsWithUserData);

  //console.log("scrollPosition", scrollPosition);

  //TODO: add a horizontal loading spinner that twitter uses when you tweet, also add animation to hide th tweet with animation like it's being consumed when you tweet
  return (
    <article className="flex flex-col">
      {posts.map(({ post, author }) => (
        <PostView key={post.id} post={post} author={author} />
      ))}

      {!hasNextPage ? (
        <div className="flex justify-center">
          <p className="p-4 font-semibold text-blue-500">
            No more tweets to load
          </p>
        </div>
      ) : (
        <div className="flex justify-center p-4">
          {isFetching ? (
            <LoadingSpinner size={30} />
          ) : (
            <p>
              Not seeing older tweets?{" "}
              <button
                className="font-semibold text-blue-500"
                onClick={() => {
                  fetchNextPage()
                    .then(() => {
                      setIsLocked(false);
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                }}
              >
                Load more
              </button>
            </p>
          )}
        </div>
      )}
    </article>
  );
};

const Home: NextPage = () => {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();

  // Start fetching asap (caching)
  api.posts.getBatch.useInfiniteQuery(
    {
      limit: 10,
    },
    {
      onSuccess: (data) => {
        console.log(
          "onSuccess: ",
          data.pages[0]?.postsWithUserData[0]?.post.content
        );
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  if (!userLoaded) return <FullLoadingPage />;

  return (
    <>
      <Head>
        <title>Chirp</title>
        <meta name="description" content="💬" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PageLayout>
        <header className="sticky top-0 z-10 overflow-clip border-b border-slate-700 bg-opacity-5 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between px-1">
            <h1 className="text-xl font-bold text-white">Home</h1>

            {isSignedIn && user && user.username && (
              <div className="flex items-center justify-center px-2">
                <UserButton afterSignOutUrl="/" />
                <span className="ml-2 font-thin">{`@${user.username}`}</span>
              </div>
            )}
            {!isSignedIn && (
              // style the sign in button
              <div className="flex justify-center">
                <SignInButton mode="modal">
                  <button className="h-10 rounded-2xl bg-blue-600  px-2 font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-full sm:px-3">
                    Sign in
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </header>
        {!!isSignedIn && (
          <div className="border-b border-slate-700 p-4">
            <CreatePostWizard />
          </div>
        )}
        <Feed />
      </PageLayout>
    </>
  );
};

export default Home;
