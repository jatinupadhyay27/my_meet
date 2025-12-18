const HomePage = () => {
  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome to <span className="text-sky-400">MyMeet</span>
      </h1>
      <p className="max-w-2xl text-sm text-slate-300">
        This is the Day 1 skeleton of a Zoom-like meeting application. Use the navigation above
        to create or join a meeting. All functionality is placeholder for now and will be wired
        to real APIs and WebRTC in later iterations.
      </p>
    </section>
  );
};

export default HomePage;


