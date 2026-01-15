import { Fragment } from 'preact';
import { ToastContainer } from './ToastContainer';
import { GlobalDialogs } from './GlobalDialogs';
import { StepRemovalDialog } from './StepRemovalDialog';
import { StatusBar } from './StatusBar';

export function GlobalUI() {
  return (
    <Fragment>
      <ToastContainer />
      <GlobalDialogs />
      <StepRemovalDialog />
      <StatusBar />
    </Fragment>
  );
}
