// this component is meant to control any errors that we might not know of
import { Component } from "react";
import PropTypes from "prop-types";

// this component is meant to control any errors that we might not know of
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error, errorInfo) {
    console.log({ error, errorInfo });
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-complementary text-accent rounded flex justify-center items-center ">
        <div className="">
           <h1 className="text-[50px] text-center">Oops! Something went wrong</h1>
    
          <div className="text-center leading-8">
            <p>Try refreshing the page</p>
            <p>Or go back to another Page</p>
          </div>
        </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default ErrorBoundary;