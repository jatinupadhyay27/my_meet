import app from './app';
import { ENV } from './config/env';

const port = ENV.PORT;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});


