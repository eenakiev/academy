import React from "react"
import { Link } from "gatsby"
import PropTypes from "prop-types"
import styles from "./header.module.scss"

const Header = ({ siteTitle }) => (
  <header className={styles.header}>
    <div className={styles.logo}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 0C7.165 0 0 7.165 0 16C0 24.835 7.165 32 16 32C24.835 32 32 24.835 32 16C32 7.165 24.835 0 16 0ZM7.775 17.5C7.39 17.5 7.005 17.355 6.715 17.06C6.13 16.475 6.13 15.525 6.715 14.94L10.975 10.68C13.745 7.91 18.255 7.91 21.025 10.68C21.305 10.96 21.465 11.345 21.465 11.74C21.465 12.14 21.305 12.52 21.025 12.8L18.805 15.015C18.22 15.6 17.27 15.6 16.685 15.015C16.1 14.43 16.1 13.48 16.685 12.895L17.64 11.94C16.14 11.29 14.325 11.575 13.095 12.8L8.835 17.06C8.545 17.355 8.16 17.5 7.775 17.5ZM25.285 17.06L21.025 21.32C19.64 22.705 17.82 23.4 16 23.4C14.18 23.4 12.36 22.705 10.975 21.32C10.695 21.04 10.535 20.655 10.535 20.26C10.535 19.86 10.695 19.48 10.975 19.2L13.195 16.985C13.78 16.4 14.73 16.4 15.315 16.985C15.9 17.57 15.9 18.52 15.315 19.105L14.36 20.06C15.86 20.715 17.68 20.425 18.905 19.2L23.165 14.94C23.75 14.355 24.7 14.355 25.285 14.94C25.87 15.525 25.87 16.475 25.285 17.06Z"
          fill="#5275FF"
        />
      </svg>
      <div className={styles.logo__text}>
        <div className={styles.logo__title}>santiment</div>
        <div className={styles.logo__desc}>app programming interface</div>
      </div>
    </div>
    <nav>
      <Link className={styles.link} to="#pricing">
        Pricing
      </Link>
      <Link className={styles.link} to="#use-cases">
        Use cases
      </Link>
      <Link className={styles.link} to="#support">
        Support
      </Link>
      <Link className={styles.login} to="/login">
        Sign up
      </Link>
    </nav>
  </header>
)

Header.propTypes = {
  siteTitle: PropTypes.string,
}

Header.defaultProps = {
  siteTitle: ``,
}

export default Header
