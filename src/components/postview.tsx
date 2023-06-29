import { type RouterOutputs } from "~/utils/api";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type PostWithUser = RouterOutputs["posts"]["getAll"][number];

export const PostView = (props: PostWithUser) => {
  const { post, author } = props;

  console.log(author.profileImageUrl);
  return (
    <div
      className="flex gap-3 border-b border-slate-700 p-4 transition duration-300 ease-in-out hover:bg-neutral-950"
      key={post.id}
    >
      <Link href={`/@${author.username}`} className="flex-shrink-0">
        <Image
          className="h-12 w-12 rounded-full"
          src={author.profileImageUrl}
          alt={`@${author.username}'s profile picture`}
          width="48"
          height="48"
        />
      </Link>

      <div className="flex flex-col gap-1 overflow-clip text-slate-300">
        <div className="flex text-slate-300">
          <Link
            className="overflow-clip overflow-ellipsis underline-offset-2 hover:underline"
            href={`/@${author.username}`}
          >
            {`@${author.username}`}
          </Link>
          <Link
            className="overflow-clip overflow-ellipsis font-thin"
            href={`/post/${post.id}`}
          >
            &nbsp;·&nbsp;{dayjs(post.createdAt).fromNow()}
          </Link>
        </div>
        <span className="text-2xl">{post.content}</span>
      </div>
    </div>
  );
};
