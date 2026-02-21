import apiClient from './client';


export const checkEmail = async (email: string) => {
  const response = await apiClient.get('/auth/check-email', {
    params:{
        "email":email
    },
  });
  return response.data;
};

export const signup = async (email: string, password: string, username: string) => {
    const response = await apiClient.post('/auth/signup',{
        email: email,
        password: password,
        username: username
    });

    return response.data;
}