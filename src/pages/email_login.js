import React from "react"
import gql from "graphql-tag"
import { replace } from "gatsby"
import { Mutation } from "react-apollo"
import { parse } from "query-string"
import Layout from "../components/layout"
import { CURRENT_USER_QUERY } from "./account"

const VERIFY_EMAIL_MUTATION = gql`
  mutation emailLoginVerify($email: String!, $token: String!) {
    emailLoginVerify(email: $email, token: $token) {
      token
      user {
        id
        email
        username
        privacyPolicyAccepted
        apikeys
      }
    }
  }
`

const updateCache = (
  cache,
  {
    data: {
      emailLoginVerify: { user },
    },
  }
) => {
  const currentUser = { ...user }
  setTimeout(() => {
    cache.writeQuery({
      query: CURRENT_USER_QUERY,
      data: { currentUser },
    })
    replace("/account")
  }, 1000)
}

export default ({ location: { search } }) => (
  <Layout>
    <Mutation mutation={VERIFY_EMAIL_MUTATION} update={updateCache}>
      {(verifyEmail, { called, error, data }) => {
        if (!called) {
          verifyEmail({ variables: parse(search) })
        }
        if (error) {
          return "Can't verify this email"
        }

        return "Verifying ...."
      }}
    </Mutation>
  </Layout>
)
