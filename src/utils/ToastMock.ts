import toast from "react-hot-toast";

export default {
  show: ({
    type,
    text1,
    text2,
  }: {
    type: string;
    text1: string;
    text2?: string;
  }) => {
    const msg = text2 ? `${text1}: ${text2}` : text1;
    if (type === "error") {
      toast.error(msg);
    } else if (type === "success") {
      toast.success(msg);
    } else {
      toast(msg);
    }
  },
  hide: () => toast.dismiss(),
};
