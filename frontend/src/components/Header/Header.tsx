import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser, SignOutButton } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Header.css";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  //TODO: uncomment these after firebase set up (Sprint 6)
  // const { isSignedIn, user } = useUser();

  const handlePlannerClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    //TODO: uncomment these after firebase set up (Sprint 6)
    // if (!isSignedIn) {
    //   e.preventDefault(); // stop navigation
    //   toast.info("You must log in to view your previous trips.");
    // }
  };

  return (
    <header className="header">
      <div className="branding">Name of Product</div>

      <div className="nav">
        <Link
          to="/"
          className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
        >
          Predetermined Trips
        </Link>
        <Link
          to="/planner"
          onClick={handlePlannerClick}
          className={`nav-link ${
            location.pathname === "/planner" ? "active" : ""
          }`}
        >
          Previous Trips
        </Link>
      </div>

      <div className="login-btn">
        {/* 
        //TODO: uncomment these after firebase set up (Sprint 6)
        {isSignedIn ? (
          <div className="flex items-center gap-2">
            <span>Hi, {user?.firstName}</span>
            <SignOutButton />
          </div>
        ) : (
          <Link to="/login">Log In</Link>
        )} */}
      </div>
    </header>
  );
}
